import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getPlanningProvider } from "../_shared/planning-providers/index.ts";
import { PlotaApiError } from "../_shared/planning-providers/plota/client.ts";
import { PlotaTierLimitationError } from "../_shared/planning-providers/plota/provider.ts";
import type { NormalisedApplication, PlanningDataProvider, RawApplication } from "../_shared/planning-providers/types.ts";

/**
 * Triggered by pg_cron via pg_net with Authorization: Bearer <CRON_SECRET>.
 * The Edge Function deliberately uses a custom bearer check rather than a
 * Supabase JWT because cron jobs do not carry a user session.
 */

type RunType = "scheduled_new" | "scheduled_updated" | "manual_backfill";
const UNDECIDED_STATUSES = ["submitted", "validated", "under_consideration", "decision_expected", "unknown"];
const PENDING_ROTATION_BATCH_SIZE = 20;
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_PLOTA_MAX_PAGES_PER_RUN = 1;
const DEFAULT_PLOTA_MANUAL_PAGES_PER_DISTRICT = 2;
const MAX_PLOTA_MANUAL_PAGES_PER_DISTRICT = 20;
const MAX_PLOTA_MANUAL_PAGES_PER_RUN = 100;
const MAX_TARGET_DISTRICTS = 50;
const DISTRICT_PATTERN = /^[A-Z]{1,2}\d{1,2}[A-Z]?$/;

interface IngestBody {
  run_type?: RunType;
  postcode_districts?: unknown;
  max_pages_per_district?: unknown;
}

interface RunStats {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
}

function defaultSince(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - DEFAULT_LOOKBACK_DAYS);
  return date.toISOString().slice(0, 10);
}

function boundedInteger(input: unknown, fallback: number, min: number, max: number): number {
  const configured = Number(input ?? fallback);
  return Number.isInteger(configured) && configured >= min && configured <= max ? configured : fallback;
}

function plotaPageCap(): number {
  return boundedInteger(
    Deno.env.get("PLOTA_MAX_PAGES_PER_RUN"),
    DEFAULT_PLOTA_MAX_PAGES_PER_RUN,
    1,
    100,
  );
}

function normaliseDistricts(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => DISTRICT_PATTERN.test(value)),
    ),
  ).slice(0, MAX_TARGET_DISTRICTS);
}

function serialiseError(err: unknown): Record<string, unknown> {
  if (err instanceof PlotaApiError) {
    return {
      message: err.message,
      type: err.type,
      status: err.status,
      requestId: err.requestId ?? null,
    };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: "unauthorized" }, 401);
  }

  let requestBody: IngestBody = {};
  try {
    requestBody = (await req.json()) as IngestBody;
  } catch {
    // No/invalid JSON body -> default to the scheduled new path.
  }

  let runType: RunType = "scheduled_new";
  if (requestBody.run_type === "scheduled_updated" || requestBody.run_type === "manual_backfill") {
    runType = requestBody.run_type;
  }

  const targetDistricts = runType === "manual_backfill" ? normaliseDistricts(requestBody.postcode_districts) : [];
  if (runType === "manual_backfill" && targetDistricts.length === 0) {
    return json(
      {
        error: "postcode_districts_required",
        message: "Manual backfill requires postcode_districts, for example [\"IP22\", \"NR1\", \"N2\"].",
      },
      400,
    );
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const providerName = Deno.env.get("PLANNING_PROVIDER") ?? "mock";
  const manualPagesPerDistrict =
    runType === "manual_backfill" && providerName === "plota"
      ? boundedInteger(
          requestBody.max_pages_per_district,
          DEFAULT_PLOTA_MANUAL_PAGES_PER_DISTRICT,
          1,
          MAX_PLOTA_MANUAL_PAGES_PER_DISTRICT,
        )
      : 1;
  const automaticPageCap =
    providerName === "plota" && runType !== "manual_backfill" ? plotaPageCap() : null;
  const maxPagesPerRun = automaticPageCap ?? Number.POSITIVE_INFINITY;

  const { data: lastRun } = await admin
    .from("ingestion_runs")
    .select("cursor_to")
    .eq("run_type", runType)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const cursorTo = lastRun?.cursor_to as { since?: string } | null;
  const since = runType === "manual_backfill" ? undefined : (cursorTo?.since ?? defaultSince());

  const { data: runRow, error: runInsertError } = await admin
    .from("ingestion_runs")
    .insert({
      provider: providerName,
      run_type: runType,
      cursor_from: { since: since ?? null, postcode_districts: targetDistricts.length > 0 ? targetDistricts : null },
    })
    .select("id")
    .single();

  if (runInsertError || !runRow) {
    return json({ error: "failed_to_start_run", message: runInsertError?.message }, 500);
  }

  const stats: RunStats = { fetched: 0, created: 0, updated: 0, unchanged: 0, errors: 0 };
  const errorDetails: Record<string, unknown>[] = [];
  let latestReceivedDate = since ?? defaultSince();
  let latestChangedAt = since ?? defaultSince();
  let fellBackToPendingRotation = false;
  let pagesRead = 0;
  let manualBudgetExhausted = false;
  const emptyDistricts: string[] = [];
  const plotaHints: Record<string, string> = {};
  let provider: PlanningDataProvider | null = null;

  try {
    // The provider is created after the run row so a missing/invalid provider
    // secret is visible in the admin health table instead of becoming a
    // silent function-level 500 before a run is recorded.
    provider = getPlanningProvider();

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
        errorDetails.push({ providerId: raw.providerId, ...serialiseError(err) });
      }
    }

    if (runType === "scheduled_updated") {
      try {
        for await (const page of provider.fetchUpdatedApplications({ since: since ?? defaultSince() })) {
          pagesRead++;
          for (const raw of page) await processRaw(raw);
          if (pagesRead >= maxPagesPerRun) break;
        }
      } catch (err) {
        if (err instanceof PlotaTierLimitationError) {
          fellBackToPendingRotation = true;
          const { data: pendingRows } = await admin
            .from("planning_applications")
            .select("provider_application_id")
            .in("status", UNDECIDED_STATUSES)
            .order("last_seen_at", { ascending: true })
            .limit(providerName === "plota" ? 2 : PENDING_ROTATION_BATCH_SIZE);

          for (const row of pendingRows ?? []) {
            const raw = await provider.getApplication(row.provider_application_id);
            await processRaw(raw);
          }
        } else {
          throw err;
        }
      }
    } else if (runType === "manual_backfill") {
      // One request per requested district, one ten-row page per request.
      // This is intentionally bounded for Plota's 500-call demo key.
      for (const district of targetDistricts) {
        const remainingBudget = MAX_PLOTA_MANUAL_PAGES_PER_RUN - pagesRead;
        if (providerName === "plota" && remainingBudget <= 0) {
          manualBudgetExhausted = true;
          break;
        }
        const pagesForDistrict =
          providerName === "plota"
            ? Math.min(manualPagesPerDistrict, remainingBudget)
            : manualPagesPerDistrict;
        const rows = await provider.searchByPostcode(district, { maxPages: pagesForDistrict });
        const providerPageCount = provider instanceof PlotaPlanningProvider ? provider.lastPageCount : 1;
        pagesRead += Math.max(1, providerPageCount);
        if (rows.length === 0) {
          emptyDistricts.push(district);
          if (provider instanceof PlotaPlanningProvider && provider.lastMeta?.hint) {
            plotaHints[district] = provider.lastMeta.hint;
          }
        }
        for (const raw of rows) await processRaw(raw);
      }
    } else {
      for await (const page of provider.fetchNewApplications({ since })) {
        pagesRead++;
        for (const raw of page) await processRaw(raw);
        if (pagesRead >= maxPagesPerRun) break;
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
        cursor_to: {
          since: runType === "scheduled_updated" ? latestChangedAt : latestReceivedDate,
          postcode_districts: targetDistricts.length > 0 ? targetDistricts : null,
          manualPagesPerDistrict: runType === "manual_backfill" ? manualPagesPerDistrict : null,
          emptyDistricts,
          plotaHints,
          plotaApiCalls: provider instanceof PlotaPlanningProvider ? provider.apiRequestCount : null,
          manualBudgetExhausted,
          fellBackToPendingRotation,
        },
      })
      .eq("id", runRow.id);

    return json({
      ok: true,
      runId: runRow.id,
      runType,
      postcodeDistricts: targetDistricts,
      pagesRead,
      manualPagesPerDistrict: runType === "manual_backfill" ? manualPagesPerDistrict : null,
      plotaApiCalls: provider instanceof PlotaPlanningProvider ? provider.apiRequestCount : null,
      emptyDistricts,
      plotaHints,
      manualBudgetExhausted,
      automaticPageCap,
      stats,
      fellBackToPendingRotation,
    });
  } catch (err) {
    const detail = serialiseError(err);
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
        error_details: [...errorDetails, detail],
      })
      .eq("id", runRow.id);

    return json({ error: "ingestion_failed", message: detail.message, details: detail }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
