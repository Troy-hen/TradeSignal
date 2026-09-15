"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerProfileTerm = {
  term_type: "service" | "target_industry" | "commercial_need" | "signal_family" | "exclusion";
  term: string;
  confidence?: number | null;
  source?: string;
};

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
    [key: string]: unknown;
  } | null;
  normalization_status?: string;
  normalized_at?: string | null;
  normalization_provider?: string | null;
  normalization_error?: string | null;
  profile_version?: number;
};

type LooseResult = { data: unknown; error: { code?: string; message?: string } | null };
type LooseBuilder = {
  select(columns: string): LooseBuilder;
  eq(column: string, value: unknown): LooseBuilder;
  upsert(values: Record<string, unknown>, options?: Record<string, unknown>): LooseBuilder;
  maybeSingle(): LooseBuilder;
};
type LooseClient = {
  from(table: string): LooseBuilder;
  rpc(name: string, args: Record<string, unknown>): Promise<LooseResult>;
};

function db(): LooseClient {
  return createAdminClient() as unknown as LooseClient;
}

async function run<T>(query: LooseBuilder): Promise<{ data: T | null; error: LooseResult["error"] }> {
  return query as unknown as Promise<{ data: T | null; error: LooseResult["error"] }>;
}

export async function getCustomerProfile(companyId: string): Promise<CustomerProfileRecord | null> {
  const { data } = await run<CustomerProfileRecord>(
    db().from("customer_profiles").select("*").eq("company_id", companyId).maybeSingle(),
  );
  return data;
}

export async function saveCustomerProfile(
  input: CustomerProfileRecord & { updated_by: string; terms?: CustomerProfileTerm[] },
): Promise<CustomerProfileRecord | null> {
  const { terms, ...record } = input;
  const client = db();
  const current = await run<{ profile_version?: number }>(
    client.from("customer_profiles").select("profile_version").eq("company_id", record.company_id).maybeSingle(),
  );
  const payload = {
    ...record,
    profile_version: Number(current.data?.profile_version ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await run<CustomerProfileRecord>(
    client.from("customer_profiles").upsert(payload, { onConflict: "company_id" }).select("*").maybeSingle(),
  );
  if (error || !data) {
    console.error("customer profile save failed", error);
    return null;
  }

  if (terms) {
    const termsResult = await client.rpc("replace_customer_profile_terms", {
      p_company_id: record.company_id,
      p_terms: terms,
    });
    if (termsResult.error) console.error("customer profile terms refresh failed", termsResult.error);
  }

  return data;
}
