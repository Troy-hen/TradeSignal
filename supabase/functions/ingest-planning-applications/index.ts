import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getPlanningProvider } from "../_shared/planning-providers/index.ts";
import { PlotaTierLimitationError } from "../_shared/planning-providers/plota/provider.ts";
import type { NormalisedApplication, RawApplication } from "../_shared/planning-providers/types.ts";

/**
 * Triggered by pg_cron via pg_net (see the two schedules created in the
 * companion migration) with Authorization: Bearer <CRON_SECRET> — a
 * dedicated Vault secret, distinct from service_role, so a leaked value
 * only lets someone trigger ingestion rather than bypass RLS entirely.
 * verify_jwt is disabled on this function for exactly that reason: pg_net's
 * call carries this custom bearer token, not a Supabase JWT.
 *
 * classification_status IS the queue between this function and Task 8's
 * classifier: ingestion's job is done the moment a planning_applications
 * row exists with a 'pending'/'stale' classification row attached
 * (guaranteed by a DB trigger — see 20260907170100_ingestion_upsert.sql) —
 * durable regardless of whether AI classification ever runs.
 */

type RunType = "scheduled_new" | "scheduled_updated" | "manual_backfill";

const UNDECIDED_STATUSES = ["submitted", "validated", "under_consideration", "decision_expected", "unknown"];
const PENDING_ROTATION_BATCH_SIZE = 20;
const DEFAULT_SINCE = "2020-01-01";

interface RunStats {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: "unauthorized" }, 401);
  }

  let runType: RunType = "scheduled_new";
  try {
    const body = await req.json();
    if (body?.run_type === "scheduled_updated" || body?.run_type === "manual_backfill") {
      runType = body.run_type;
    }
  } catch {
    // No/invalid JSON body -> default to scheduled_new (the cron schedules
    // always send a body, but a manual test call without one shouldn't 500).
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const providerName = Deno.env.get("PLANNING_PROVIDER") ?? "mock";
  const provider = getPlanningProvider();

  const { data: lastRun } = await admin
    .from("ingestion_runs")
    .select("cursor_to")
    .eq("run_type", runType)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const cursorTo = lastRun?.cursor_to as { since?: string } | null;
  const since = runType === "manual_backfill" ? undefined : (cursorTo?.since ?? DEFAULT_SINCE);

  const { data: runRow, error: runInsertError } = await admin
    .from("ingestion_runs")
    .insert({ provider: providerName, run_type: runType, cursor_from: { since: since ?? null } })
    .select("id")
    .single();

  if (runInsertError || !runRow) {
    return json({ error: "failed_to_start_run", message: runInsertError?.message }, 500);
  }

  const stats: RunStats = { fetched: 0, created: 0, updated: 0, unchanged: 0, errors: 0 };
  const errorDetails: Record<string, unknown>[] = [];
  let latestReceivedDate = since ?? DEFAULT_SINCE;
  let latestChangedAt = since ?? DEFAULT_SINCE;
  let fellBackToPendingRotation = false;

  async function processRaw(raw: RawApplication | null) {
    if (!raw) return;
    stats.fetched++;
    try {
      const normalised: NormalisedApplication = await provider.normaliseApplication(raw);
      const { data, error } = await admin.rpc("upsert_planning_application", { p_application: normalised });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.is_new) stats.created++;
      else if (result?.is_changed) stats.updated++;
      else stats.unchanged++;

      if (raw.receivedDate && raw.receivedDate > latestReceivedDate) latestReceivedDate = raw.receivedDate;
      if (raw.changedAt && raw.changedAt > latestChangedAt) latestChangedAt = raw.changedAt;
    } catch (err) {
      stats.errors++;
      errorDetails.push({ providerId: raw.providerId, message: err instanceof Error ? err.message : String(err) });
    }
  }

  try {
    if (runType === "scheduled_updated") {
      try {
        for await (const page of provider.fetchUpdatedApplications({ since: since ?? DEFAULT_SINCE })) {
          for (const raw of page) await processRaw(raw);
        }
      } catch (err) {
        if (err instanceof PlotaTierLimitationError) {
          // Starter/Demo Plota tier: no changed_since access. Fall back to
          // re-checking a rotation of OUR OWN currently-undecided
          // applications via getApplication() — this provider has no
          // knowledge of our schema, so that rotation lives here, not in it.
          fellBackToPendingRotation = true;
          const { data: pendingRows } = await admin
            .from("planning_applications")
            .select("provider_application_id")
            .in("status", UNDECIDED_STATUSES)
            .order("last_seen_at", { ascending: true })
            .limit(PENDING_ROTATION_BATCH_SIZE);

          for (const row of pendingRows ?? []) {
            const raw = await provider.getApplication(row.provider_application_id);
            await processRaw(raw);
          }
        } else {
          throw err;
        }
      }
    } else {
      for await (const page of provider.fetchNewApplications({ since })) {
        for (const raw of page) await processRaw(raw);
      }
    }

    const status: "completed" | "partial" | "failed" =
      stats.errors > 0 && stats.errors === stats.fetched && stats.fetched > 0
        ? "failed"
        : stats.errors > 0
          ? "partial"
          : "completed";

    await admin
      .from("ingestion_runs")
      .update({
        finished_at: new Date().toISOString(),
        status,
        applications_fetched: stats.fetched,
        applications_created: stats.created,
        applications_updated: stats.updated,
        applications_unchanged: stats.unchanged,
        errors_count: stats.errors,
        error_details: errorDetails.length > 0 ? errorDetails : null,
        cursor_to: { since: runType === "scheduled_updated" ? latestChangedAt : latestReceivedDate, fellBackToPendingRotation },
      })
      .eq("id", runRow.id);

    return json({ ok: true, runId: runRow.id, runType, stats, fellBackToPendingRotation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("ingestion_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "failed",
        applications_fetched: stats.fetched,
        applications_created: stats.created,
        applications_updated: stats.updated,
        applications_unchanged: stats.unchanged,
        errors_count: stats.errors + 1,
        error_details: [...errorDetails, { message }],
      })
      .eq("id", runRow.id);

    return json({ error: "ingestion_failed", message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
