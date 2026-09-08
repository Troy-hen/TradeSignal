import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAiProvider } from "../_shared/ai/index.ts";
import { buildEnrichmentInput } from "../_shared/ai/prompt.ts";
import type { AiPromptVersion, EnrichmentResult } from "../_shared/ai/types.ts";

/**
 * Triggered by pg_cron (Authorization: Bearer <CRON_SECRET>, same scheme as
 * ingest-planning-applications) every 2 minutes for the normal batch path,
 * or on demand with a { planning_application_id } body for the admin
 * "reprocess" action (Task 13).
 *
 * classification_status is the queue: claim_classification_batch() durably
 * marks a batch 'processing' (see 20260907170400_classification_batch_and_prompt.sql)
 * so overlapping invocations never double-process the same row. Every
 * attempt — success or failure — writes an ai_enrichment_runs row first;
 * planning_applications itself is never touched here, so a model failure
 * never loses the underlying planning record.
 */

const BATCH_SIZE = 15;

interface TradeCategoryRow {
  id: string;
  slug: string;
  name: string;
  ai_detection_hints: unknown;
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: "unauthorized" }, 401);
  }

  let manualApplicationId: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.planning_application_id === "string") manualApplicationId = body.planning_application_id;
  } catch {
    // No/invalid JSON body -> normal batch run.
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: promptVersion } = await admin
    .from("ai_prompt_versions")
    .select("id, model, system_prompt")
    .eq("task", "application_enrichment")
    .eq("active", true)
    .maybeSingle();

  if (!promptVersion) {
    return json({ error: "no_active_prompt_version" }, 500);
  }

  const { data: tradeCategories } = await admin
    .from("trade_categories")
    .select("id, slug, name, ai_detection_hints")
    .eq("is_active", true);

  let provider;
  try {
    provider = getAiProvider();
  } catch (err) {
    return json({ error: "provider_not_configured", message: err instanceof Error ? err.message : String(err) }, 500);
  }

  type ClaimedRow = { id: string; planning_application_id: string; attempts: number; previous_status: string };
  let claimed: ClaimedRow[] = [];

  if (manualApplicationId) {
    const { data } = await admin
      .from("application_classifications")
      .update({ classification_status: "processing" })
      .eq("planning_application_id", manualApplicationId)
      .select("id, planning_application_id, attempts")
      .returns<{ id: string; planning_application_id: string; attempts: number }[]>();
    claimed = (data ?? []).map((row) => ({ ...row, previous_status: "manual" }));
  } else {
    const { data } = await admin.rpc("claim_classification_batch", { p_limit: BATCH_SIZE });
    claimed = (data as ClaimedRow[] | null) ?? [];
  }

  const results = { processed: 0, succeeded: 0, failed: 0 };

  for (const row of claimed) {
    results.processed++;
    const ok = await classifyOne(admin, provider, promptVersion, tradeCategories ?? [], row);
    if (ok) results.succeeded++;
    else results.failed++;
  }

  return json({ ok: true, ...results });
});

async function classifyOne(
  // deno-lint-ignore no-explicit-any
  admin: any,
  provider: ReturnType<typeof getAiProvider>,
  promptVersion: AiPromptVersion,
  tradeCategories: TradeCategoryRow[],
  claimedRow: { id: string; planning_application_id: string; attempts: number; previous_status: string },
): Promise<boolean> {
  const { data: application } = await admin
    .from("planning_applications")
    .select(
      "id, content_hash, postcode_district, application_type, proposal_description, dwelling_count, is_commercial, floorspace_sqm, status",
    )
    .eq("id", claimedRow.planning_application_id)
    .maybeSingle();

  if (!application) {
    await admin
      .from("application_classifications")
      .update({ classification_status: "failed", attempts: claimedRow.attempts + 1 })
      .eq("id", claimedRow.id);
    return false;
  }

  const input = buildEnrichmentInput(application, tradeCategories);
  const startedAt = new Date().toISOString();
  const result: EnrichmentResult = await provider.enrich(promptVersion, input);

  const triggerReason =
    claimedRow.previous_status === "manual"
      ? "manual_reprocess"
      : claimedRow.previous_status === "stale"
        ? "content_changed"
        : "new_application";

  await admin.from("ai_enrichment_runs").insert({
    planning_application_id: application.id,
    prompt_version_id: promptVersion.id,
    trigger_reason: triggerReason,
    provider: provider.name,
    model: promptVersion.model,
    input_payload: { text: input },
    raw_response: result.rawResponse ? JSON.parse(JSON.stringify(result.rawResponse)) : null,
    parsed_successfully: result.success,
    validation_errors: result.validationErrors ?? null,
    input_tokens: result.inputTokens ?? null,
    output_tokens: result.outputTokens ?? null,
    total_tokens:
      result.inputTokens !== undefined && result.outputTokens !== undefined
        ? result.inputTokens + result.outputTokens
        : null,
    latency_ms: result.latencyMs,
    status: result.success ? "success" : "failed",
    error_message: result.errorMessage ?? null,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
  });

  if (!result.success || !result.data) {
    await admin
      .from("application_classifications")
      .update({ classification_status: "failed", attempts: claimedRow.attempts + 1 })
      .eq("id", claimedRow.id);
    return false;
  }

  const opportunity = result.data;

  await admin
    .from("application_classifications")
    .update({
      content_hash: application.content_hash,
      project_type: opportunity.project_type,
      project_size_category: opportunity.project_complexity,
      estimated_total_project_value_low: opportunity.estimated_total_project_value_low,
      estimated_total_project_value_high: opportunity.estimated_total_project_value_high,
      likely_start_window: opportunity.likely_start_window,
      opportunity_timing: opportunity.opportunity_timing,
      summary: opportunity.project_summary,
      ai_confidence: opportunity.confidence_score,
      classification_status: "completed",
      attempts: claimedRow.attempts + 1,
      last_classified_at: new Date().toISOString(),
    })
    .eq("id", claimedRow.id);

  const tradeIdBySlug = new Map(tradeCategories.map((t) => [t.slug, t.id]));
  const slugByTradeId = new Map(tradeCategories.map((t) => [t.id, t.slug]));
  const matchedSlugs = new Set<string>();

  for (const tradeOpp of opportunity.trade_opportunities) {
    const tradeCategoryId = tradeIdBySlug.get(tradeOpp.trade_category_slug);
    if (!tradeCategoryId) continue; // Model returned an unrecognised slug — skip rather than fail the whole batch.
    matchedSlugs.add(tradeOpp.trade_category_slug);

    await admin.from("application_trade_opportunities").upsert(
      {
        planning_application_id: application.id,
        application_classification_id: claimedRow.id,
        trade_category_id: tradeCategoryId,
        fit_score: tradeOpp.fit_score,
        match_reasons: tradeOpp.match_reasons,
        likely_scope: tradeOpp.likely_scope,
        estimated_trade_value_low: tradeOpp.estimated_trade_value_low,
        estimated_trade_value_high: tradeOpp.estimated_trade_value_high,
        recommended_action: tradeOpp.recommended_action,
        recommended_contact_timing: tradeOpp.recommended_contact_timing,
        risk_flags: tradeOpp.risk_flags,
        ai_confidence: tradeOpp.confidence_score,
        is_active: true,
        postcode_district: application.postcode_district,
      },
      { onConflict: "planning_application_id,trade_category_id" },
    );
  }

  // A trade active from a previous pass that this reprocessing no longer
  // returns becomes inactive, never deleted — preserves any lead_matches/
  // lead_actions/notes tied to that row's stable id.
  const { data: existingOpps } = await admin
    .from("application_trade_opportunities")
    .select("id, trade_category_id")
    .eq("planning_application_id", application.id)
    .eq("is_active", true);

  const staleOppIds = (existingOpps ?? [])
    .filter((row: { id: string; trade_category_id: string }) => {
      const slug = slugByTradeId.get(row.trade_category_id);
      return !slug || !matchedSlugs.has(slug);
    })
    .map((row: { id: string }) => row.id);

  if (staleOppIds.length > 0) {
    await admin.from("application_trade_opportunities").update({ is_active: false }).in("id", staleOppIds);
  }

  return true;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
