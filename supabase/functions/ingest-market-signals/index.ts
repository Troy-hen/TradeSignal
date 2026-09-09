import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { configuredMarketSignalProviders } from "../_shared/market-signal-providers/types.ts";
import { createPublicProcurementProvider } from "../_shared/market-signal-providers/public-procurement.ts";
import { matchSignalToTrades, type TradeCategory } from "../_shared/market-signal-providers/trade-matcher.ts";
import type { NormalizedMarketSignal } from "../_shared/market-signal-providers/types.ts";

type Body = { providers?: unknown; since?: unknown; limit?: unknown };
type ProviderStats = { fetched: number; relevant: number; upserted: number; matches: number; errors: number };

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("Authorization") !== `Bearer ${cronSecret}`) return json({ error: "unauthorized" }, 401);

  let body: Body = {};
  try { body = await req.json() as Body; } catch { /* scheduled calls may omit a body */ }

  const configured = configuredMarketSignalProviders();
  const requested = Array.isArray(body.providers)
    ? body.providers.filter((value): value is string => typeof value === "string").map((value) => value.trim().toLowerCase())
    : configured;
  const providers = requested.filter((value) => configured.includes(value));
  if (providers.length === 0) return json({ ok: true, message: "No market signal providers enabled", providers: [] });

  const since = normalizeSince(body.since);
  const limit = boundedInt(body.limit, 50, 1, 100);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: tradeRows, error: tradeError } = await admin.from("trade_categories").select("id,name,slug").eq("is_active", true);
  if (tradeError) return json({ error: "trade_categories_unavailable", detail: tradeError.message }, 500);
  const trades = (tradeRows ?? []) as TradeCategory[];

  const results: Record<string, ProviderStats & { error?: string }> = {};
  for (const providerName of providers) {
    const stats: ProviderStats = { fetched: 0, relevant: 0, upserted: 0, matches: 0, errors: 0 };
    results[providerName] = stats;
    try {
      const provider = createPublicProcurementProvider(providerName);
      const signals = await provider.fetchSignals({ since, limit });
      stats.fetched = signals.length;
      for (const signal of signals) {
        try {
          const matches = matchSignalToTrades(signal, trades);
          if (matches.length === 0) continue;
          stats.relevant += 1;
          const signalId = await upsertSignal(admin, signal);
          if (!signalId) { stats.errors += 1; continue; }
          stats.upserted += 1;
          const { error: matchError } = await admin.from("market_signal_trade_matches").upsert(
            matches.map((match) => ({
              signal_id: signalId,
              trade_category_id: match.tradeCategoryId,
              fit_score: match.fitScore,
              opportunity_bucket: match.opportunityBucket,
              estimated_trade_value_low: match.estimatedTradeValueLow,
              estimated_trade_value_high: match.estimatedTradeValueHigh,
              recommended_action: match.recommendedAction,
              ai_confidence: null,
              match_reasons: match.matchReasons,
              match_method: match.matchMethod,
              scored_at: new Date().toISOString(),
              is_active: true,
            })),
            { onConflict: "signal_id,trade_category_id" },
          );
          if (matchError) { console.error("market signal match upsert failed", matchError); stats.errors += 1; }
          else stats.matches += matches.length;
        } catch (error) {
          stats.errors += 1;
          console.error(`Failed to persist ${providerName} signal`, error);
        }
      }
    } catch (error) {
      stats.errors += 1;
      results[providerName] = { ...stats, error: error instanceof Error ? error.message : String(error) };
      console.error(`Market signal provider ${providerName} failed`, error);
    }
  }

  return json({ ok: true, since, limit, providers: results });
});

async function upsertSignal(admin: ReturnType<typeof createClient>, signal: NormalizedMarketSignal): Promise<string | null> {
  // The same procurement can be syndicated through more than one UK portal.
  // Prefer the OCDS identifier as the cross-source identity so a territory
  // count cannot double simply because Find a Tender also references a PCS or
  // Contracts Finder release.
  if (signal.externalOcid) {
    const { data: existing } = await admin
      .from("market_signals")
      .select("id")
      .eq("external_ocid", signal.externalOcid)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await admin.from("market_signals").update(signalPayload(signal)).eq("id", existing.id);
      if (error) { console.error("market signal update failed", error); return null; }
      return existing.id;
    }
  }

  const { data, error } = await admin
    .from("market_signals")
    .upsert(signalPayload(signal), { onConflict: "source,source_signal_id" })
    .select("id")
    .single();
  if (error) {
    console.error("market signal upsert failed", { source: signal.source, sourceSignalId: signal.sourceSignalId, error });
    return null;
  }
  return data?.id ?? null;
}

function signalPayload(signal: NormalizedMarketSignal) {
  return {
    source: signal.source,
    source_signal_id: signal.sourceSignalId,
    signal_type: signal.signalType,
    title: signal.title,
    summary: signal.summary ?? null,
    location_text: signal.locationText ?? null,
    postcode_district: signal.postcodeDistrict ?? null,
    latitude: signal.latitude ?? null,
    longitude: signal.longitude ?? null,
    estimated_project_value_low: signal.estimatedProjectValueLow ?? null,
    estimated_project_value_high: signal.estimatedProjectValueHigh ?? null,
    source_url: signal.sourceUrl ?? null,
    published_at: signal.publishedAt ?? null,
    content_hash: signal.contentHash ?? null,
    raw_payload: signal.rawPayload ?? {},
    is_active: true,
    updated_at: new Date().toISOString(),
    procurement_stage: signal.procurementStage ?? null,
    notice_type: signal.noticeType ?? null,
    external_ocid: signal.externalOcid ?? null,
    buyer_name: signal.buyerName ?? null,
    buyer_identifier: signal.buyerIdentifier ?? null,
    supplier_name: signal.supplierName ?? null,
    deadline_at: signal.deadlineAt ?? null,
    contract_start_date: signal.contractStartDate ?? null,
    contract_end_date: signal.contractEndDate ?? null,
    cpv_codes: signal.cpvCodes ?? [],
    delivery_postcodes: signal.deliveryPostcodes ?? [],
    delivery_regions: signal.deliveryRegions ?? [],
    contact: signal.contact ?? {},
    value_currency: signal.valueCurrency ?? "GBP",
    source_updated_at: signal.sourceUpdatedAt ?? signal.publishedAt ?? null,
    location_confidence: signal.locationConfidence ?? "unresolved",
  };
}

function normalizeSince(value: unknown) {
  if (typeof value === "string") { const parsed = new Date(value); if (Number.isFinite(parsed.getTime())) return parsed.toISOString(); }
  const date = new Date(); date.setUTCDate(date.getUTCDate() - 3); return date.toISOString();
}
function boundedInt(value: unknown, fallback: number, min: number, max: number) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback; }
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
