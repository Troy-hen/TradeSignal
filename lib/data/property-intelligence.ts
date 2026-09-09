import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type StoredPropertyIntelligence = {
  id: string;
  provider: string;
  uprn: string;
  match_method: string;
  match_confidence: number;
  matched_address: string | null;
  postcode: string | null;
  estimated_value_gbp: number | null;
  value_min_gbp: number | null;
  value_max_gbp: number | null;
  avm_confidence: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garden: boolean | null;
  parking: boolean | null;
  latest_trigger_type: string | null;
  latest_trigger_date: string | null;
  last_transaction_date: string | null;
  last_transaction_price_gbp: number | null;
  likely_to_sell_percentile: number | null;
  timing_signal: "strong" | "positive" | "neutral" | "caution";
  timing_reasons: string[];
  trigger_history: Array<{ type?: string; date?: string | null; price?: number | null; tenure?: string | null }>;
  transaction_history: Array<{ date?: string | null; price?: number | null }>;
  planning_history: Array<{ planningId?: string; address?: string | null; receivedDate?: string | null; decision?: string | null }>;
  retrieved_at: string;
  expires_at: string | null;
};

export async function getStoredPropertyIntelligence(companyId: string, opportunityId: string): Promise<StoredPropertyIntelligence | null> {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { data, error } = await db
    .from("property_intelligence_records")
    .select("id,provider,uprn,match_method,match_confidence,matched_address,postcode,estimated_value_gbp,value_min_gbp,value_max_gbp,avm_confidence,bedrooms,bathrooms,garden,parking,latest_trigger_type,latest_trigger_date,last_transaction_date,last_transaction_price_gbp,likely_to_sell_percentile,timing_signal,timing_reasons,trigger_history,transaction_history,planning_history,retrieved_at,expires_at")
    .eq("company_id", companyId)
    .eq("opportunity_id", opportunityId)
    .order("retrieved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    ...data,
    match_confidence: Number(data.match_confidence ?? 0),
    estimated_value_gbp: toNumber(data.estimated_value_gbp),
    value_min_gbp: toNumber(data.value_min_gbp),
    value_max_gbp: toNumber(data.value_max_gbp),
    avm_confidence: toNumber(data.avm_confidence),
    last_transaction_price_gbp: toNumber(data.last_transaction_price_gbp),
    likely_to_sell_percentile: toNumber(data.likely_to_sell_percentile),
    timing_reasons: Array.isArray(data.timing_reasons) ? data.timing_reasons.filter((item): item is string => typeof item === "string") : [],
    trigger_history: Array.isArray(data.trigger_history) ? data.trigger_history : [],
    transaction_history: Array.isArray(data.transaction_history) ? data.transaction_history : [],
    planning_history: Array.isArray(data.planning_history) ? data.planning_history : [],
  } as StoredPropertyIntelligence;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
