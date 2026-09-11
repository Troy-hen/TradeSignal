import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerProfileRecord = {
  company_id: string;
  what_do_you_sell: string;
  ideal_customer: string | null;
  exclusions: string | null;
  where_do_you_sell: string | null;
  normalized_profile: {
    label?: string;
    keywords?: string[];
    buyerTypes?: string[];
    candidateTradeSlug?: string | null;
    confidence?: number;
    source?: "ai" | "fallback";
  } | null;
};

type LooseResult = { data: unknown; error: { code?: string; message?: string } | null };
type LooseBuilder = {
  select(columns: string): LooseBuilder;
  eq(column: string, value: unknown): LooseBuilder;
  upsert(values: Record<string, unknown>, options?: Record<string, unknown>): LooseBuilder;
  maybeSingle(): LooseBuilder;
};
type LooseClient = { from(table: string): LooseBuilder };

function db(): LooseClient { return createAdminClient() as unknown as LooseClient; }
async function run<T>(query: LooseBuilder): Promise<{ data: T | null; error: LooseResult["error"] }> { return query as unknown as Promise<{ data: T | null; error: LooseResult["error"] }>; }

export async function getCustomerProfile(companyId: string): Promise<CustomerProfileRecord | null> {
  const { data } = await run<CustomerProfileRecord>(db().from("customer_profiles").select("*").eq("company_id", companyId).maybeSingle());
  return data;
}

export async function saveCustomerProfile(input: CustomerProfileRecord & { updated_by: string }): Promise<CustomerProfileRecord | null> {
  const { data } = await run<CustomerProfileRecord>(db().from("customer_profiles").upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: "company_id" }).select("*").maybeSingle());
  return data;
}
