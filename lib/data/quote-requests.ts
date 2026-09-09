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

export async function getOpportunityQuoteRequests(companyId: string, opportunityId: string): Promise<OpportunityQuoteRequest[]> {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { data, error } = await db
    .from("quote_requests")
    .select("id,audience_type,name,email,phone,preferred_contact_method,message,status,submitted_at")
    .eq("company_id", companyId)
    .eq("opportunity_id", opportunityId)
    .order("submitted_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("Quote request retrieval failed", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    audienceType: row.audience_type as OpportunityQuoteRequest["audienceType"],
    name: String(row.name),
    email: typeof row.email === "string" ? row.email : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    preferredContactMethod: row.preferred_contact_method as OpportunityQuoteRequest["preferredContactMethod"],
    message: typeof row.message === "string" ? row.message : null,
    status: row.status as OpportunityQuoteRequest["status"],
    submittedAt: String(row.submitted_at),
  }));
}
