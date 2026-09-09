import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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
  postcode_district: string;
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
  postcode_district: string;
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
  const { data, error } = await client.rpc("browse_owned_market_signals", { p_limit: limit });
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
