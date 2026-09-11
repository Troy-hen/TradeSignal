import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TerritoryTradeIntelligence = {
  postcode_district: string;
  trade_name: string;
  trade_slug: string;
  planning_count: number;
  tender_count: number;
  public_pipeline_count: number;
  contract_award_count: number;
  commercial_development_count: number;
  total_opportunity_count: number;
  estimated_trade_value_gbp: number;
  owns_territory: boolean;
};

export type TerritoryTradeSignal = {
  source_kind: "planning" | "tender" | "public_pipeline" | "contract_award" | "commercial_development" | string;
  source_record_id: string;
  headline: string;
  stage: string | null;
  estimated_trade_value_low: number | null;
  estimated_trade_value_high: number | null;
  published_at: string | null;
  deadline_at: string | null;
  buyer_name: string | null;
  summary: string | null;
  recommended_action: string | null;
  access_level: "full" | "teaser";
  source_url: string | null;
  score: number | null;
  opportunity_bucket: string | null;
};

export type OwnedMarketSignal = {
  market_signal_trade_match_id: string;
  signal_type: string;
  title: string;
  postcode_district: string | null;
  location_label: string;
  location_scope: "exact" | "regional";
  trade_name: string;
  trade_slug: string;
  procurement_stage: string | null;
  buyer_name: string | null;
  estimated_trade_value_low: number | null;
  estimated_trade_value_high: number | null;
  deadline_at: string | null;
  published_at: string | null;
  fit_score: number | null;
  opportunity_bucket: string | null;
  recommended_action: string | null;
  source_url: string | null;
  current_action: string;
};

export type MarketSignalSearchResult = {
  market_signal_trade_match_id: string;
  signal_type: string;
  title: string;
  postcode_district: string | null;
  post_town: string | null;
  trade_name: string;
  trade_slug: string;
  procurement_stage: string | null;
  buyer_name: string | null;
  estimated_trade_value_low: number | null;
  estimated_trade_value_high: number | null;
  deadline_at: string | null;
  access_level: "full" | "teaser";
  recommended_action: string | null;
  source_url: string | null;
  fit_score: number | null;
  total_matches: number;
};

export type MarketSignalDetail = {
  market_signal_trade_match_id: string;
  signal_id: string;
  signal_type: string;
  title: string;
  summary: string | null;
  location_text: string | null;
  postcode_district: string | null;
  trade_name: string;
  trade_slug: string;
  project_value_low: number | null;
  project_value_high: number | null;
  estimated_trade_value_low: number | null;
  estimated_trade_value_high: number | null;
  fit_score: number | null;
  opportunity_bucket: string | null;
  match_reasons: string[];
  recommended_action: string | null;
  procurement_stage: string | null;
  notice_type: string | null;
  buyer_name: string | null;
  buyer_identifier: string | null;
  supplier_name: string | null;
  deadline_at: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  cpv_codes: string[];
  contact: Record<string, unknown> | null;
  source: string;
  source_url: string | null;
  external_ocid: string | null;
  published_at: string | null;
  current_action: string;
};

async function db() {
  return (await createClient()) as unknown as SupabaseClient;
}

export async function getTerritoryTradeIntelligence(postcodeDistrict: string, tradeSlug: string): Promise<TerritoryTradeIntelligence | null> {
  const client = await db();
  const { data, error } = await client.rpc("browse_territory_trade_intelligence", {
    p_postcode_district: postcodeDistrict,
    p_trade_slug: tradeSlug,
  });
  if (error) { console.error("trade intelligence summary failed", error); return null; }
  const row = Array.isArray(data) ? data[0] : null;
  return row ? normalizeNumbers(row) as TerritoryTradeIntelligence : null;
}

export async function getTerritoryTradeSignalFeed(postcodeDistrict: string, tradeSlug: string, limit = 30): Promise<TerritoryTradeSignal[]> {
  const client = await db();
  const { data, error } = await client.rpc("browse_territory_trade_signal_feed", {
    p_postcode_district: postcodeDistrict,
    p_trade_slug: tradeSlug,
    p_limit: limit,
  });
  if (error) { console.error("trade intelligence feed failed", error); return []; }
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => normalizeNumbers(row) as TerritoryTradeSignal);
}

export async function getOwnedMarketSignals(limit = 100): Promise<OwnedMarketSignal[]> {
  const client = await db();
  const { data, error } = await client.rpc("browse_owned_market_signals_v2", { p_limit: limit });
  if (error) { console.error("owned market signals failed", error); return []; }
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => normalizeNumbers(row) as OwnedMarketSignal);
}

export async function searchMarketTradeSignals(input: {
  location: string;
  tradeSlug?: string | null;
  signalType?: string | null;
  limit?: number;
}): Promise<MarketSignalSearchResult[]> {
  const client = await db();
  const { data, error } = await client.rpc("search_market_trade_signals", {
    p_location: input.location,
    p_trade_slug: input.tradeSlug ?? null,
    p_signal_type: input.signalType ?? null,
    p_limit: input.limit ?? 12,
  });
  if (error) { console.error("market trade signal search failed", error); return []; }
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => normalizeNumbers(row) as MarketSignalSearchResult);
}

export async function getOwnedMarketSignal(matchId: string): Promise<MarketSignalDetail | null> {
  const client = await db();
  const { data, error } = await client.rpc("get_owned_market_signal", { p_match_id: matchId });
  if (error) { console.error("market signal detail failed", error); return null; }
  const row = Array.isArray(data) ? data[0] : null;
  return row ? normalizeNumbers(row) as MarketSignalDetail : null;
}

function normalizeNumbers(row: Record<string, unknown>): Record<string, unknown> {
  const output = { ...row };
  for (const key of [
    "planning_count","tender_count","public_pipeline_count","contract_award_count","commercial_development_count","total_opportunity_count","total_matches",
    "estimated_trade_value_gbp","estimated_trade_value_low","estimated_trade_value_high","project_value_low","project_value_high","fit_score","score",
  ]) {
    if (output[key] !== null && output[key] !== undefined) output[key] = Number(output[key]);
  }
  return output;
}


/**
 * Reads the complete market signal server-side after a paid lead unlock.
 * The legacy owned-signal RPC is intentionally territory-scoped; this path
 * keeps the new £20 opportunity purchase independent from territory ownership.
 */
export async function getMarketSignalForLeadUnlock(matchId: string): Promise<MarketSignalDetail | null> {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: match, error: matchError } = await admin.from("market_signal_trade_matches").select("*").eq("id", matchId).eq("is_active", true).maybeSingle();
  if (matchError || !match) return null;
  const matchRow = match as Record<string, unknown>;
  const [{ data: signal, error: signalError }, { data: trade, error: tradeError }] = await Promise.all([
    admin.from("market_signals").select("*").eq("id", matchRow.signal_id).eq("is_active", true).maybeSingle(),
    admin.from("trade_categories").select("name,slug").eq("id", matchRow.trade_category_id).maybeSingle(),
  ]);
  if (signalError || tradeError || !signal) return null;
  const signalRow = signal as Record<string, unknown>;
  const tradeRow = (trade ?? {}) as Record<string, unknown>;
  return normalizeNumbers({
    market_signal_trade_match_id: matchRow.id,
    signal_id: signalRow.id,
    signal_type: signalRow.signal_type,
    title: signalRow.title,
    summary: signalRow.summary ?? null,
    location_text: signalRow.location_text ?? null,
    postcode_district: signalRow.postcode_district ?? null,
    trade_name: tradeRow.name ?? "Matched profile",
    trade_slug: tradeRow.slug ?? "",
    project_value_low: signalRow.estimated_project_value_low ?? null,
    project_value_high: signalRow.estimated_project_value_high ?? null,
    estimated_trade_value_low: matchRow.estimated_trade_value_low ?? null,
    estimated_trade_value_high: matchRow.estimated_trade_value_high ?? null,
    fit_score: matchRow.fit_score ?? null,
    opportunity_bucket: matchRow.opportunity_bucket ?? bucketForScore(matchRow.fit_score),
    match_reasons: Array.isArray(matchRow.match_reasons) ? matchRow.match_reasons.filter((value): value is string => typeof value === "string") : [],
    recommended_action: matchRow.recommended_action ?? null,
    procurement_stage: signalRow.procurement_stage ?? signalRow.notice_type ?? null,
    notice_type: signalRow.notice_type ?? null,
    buyer_name: signalRow.buyer_name ?? null,
    buyer_identifier: signalRow.buyer_identifier ?? null,
    supplier_name: signalRow.supplier_name ?? null,
    deadline_at: signalRow.deadline_at ?? null,
    contract_start_date: signalRow.contract_start_date ?? null,
    contract_end_date: signalRow.contract_end_date ?? null,
    cpv_codes: Array.isArray(signalRow.cpv_codes) ? signalRow.cpv_codes.filter((value): value is string => typeof value === "string") : [],
    contact: signalRow.contact ?? null,
    source: signalRow.source,
    source_url: signalRow.source_url ?? null,
    external_ocid: signalRow.external_ocid ?? null,
    published_at: signalRow.published_at ?? null,
    current_action: "new",
  }) as MarketSignalDetail;
}

function bucketForScore(value: unknown): string | null {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return null;
  if (score >= 90) return "hot";
  if (score >= 75) return "strong";
  if (score >= 50) return "possible";
  return "low";
}
