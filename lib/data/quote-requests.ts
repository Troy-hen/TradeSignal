import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type OpportunityQuoteRequest = {
  id: string;
  audienceType: "homeowner" | "professional" | "business" | "unknown";
  name: string;
  email: string | null;
  phone: string | null;
  preferredContactMethod: "phone" | "email" | "either";
  message: string | null;
  status: "new" | "contacted" | "quote_scheduled" | "quoted" | "won" | "lost" | "closed";
  submittedAt: string;
};

const SELECT = "id,audience_type,name,email,phone,preferred_contact_method,message,status,submitted_at";

export async function getOpportunityQuoteRequests(companyId: string, opportunityId: string): Promise<OpportunityQuoteRequest[]> {
  return getQuoteRequests(companyId, "opportunity_id", opportunityId);
}

export async function getMarketSignalQuoteRequests(companyId: string, marketSignalTradeMatchId: string): Promise<OpportunityQuoteRequest[]> {
  return getQuoteRequests(companyId, "market_signal_trade_match_id", marketSignalTradeMatchId);
}

export async function getNewWorkspaceQuoteRequests(companyId: string, limit = 20): Promise<Array<OpportunityQuoteRequest & {
  opportunityId: string | null;
  marketSignalTradeMatchId: string | null;
}>> {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { data, error } = await db
    .from("quote_requests")
    .select(`${SELECT},opportunity_id,market_signal_trade_match_id`)
    .eq("company_id", companyId)
    .eq("status", "new")
    .order("submitted_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 50)));
  if (error) {
    console.error("Workspace quote request retrieval failed", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...mapRow(row),
    opportunityId: typeof row.opportunity_id === "string" ? row.opportunity_id : null,
    marketSignalTradeMatchId: typeof row.market_signal_trade_match_id === "string" ? row.market_signal_trade_match_id : null,
  }));
}

async function getQuoteRequests(companyId: string, column: "opportunity_id" | "market_signal_trade_match_id", id: string) {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { data, error } = await db.from("quote_requests").select(SELECT).eq("company_id", companyId).eq(column, id).order("submitted_at", { ascending: false }).limit(10);
  if (error) {
    console.error("Quote request retrieval failed", error);
    return [];
  }
  return (data ?? []).map(mapRow);
}

function mapRow(row: Record<string, unknown>): OpportunityQuoteRequest {
  return {
    id: String(row.id),
    audienceType: row.audience_type as OpportunityQuoteRequest["audienceType"],
    name: String(row.name),
    email: typeof row.email === "string" ? row.email : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    preferredContactMethod: row.preferred_contact_method as OpportunityQuoteRequest["preferredContactMethod"],
    message: typeof row.message === "string" ? row.message : null,
    status: row.status as OpportunityQuoteRequest["status"],
    submittedAt: String(row.submitted_at),
  };
}
