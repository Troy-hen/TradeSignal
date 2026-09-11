import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const LEAD_UNLOCK_AMOUNT_PENCE = 2000;

export type LeadUnlockTarget =
  | { opportunityId: string; marketSignalId?: never }
  | { marketSignalId: string; opportunityId?: never };

export type LeadUnlockRow = {
  id: string;
  company_id: string;
  application_trade_opportunity_id: string | null;
  market_signal_trade_match_id: string | null;
  status: "pending" | "paid" | "expired" | "refunded" | "failed";
  amount_pence: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  unlocked_at: string | null;
};

type LooseResult = { data: unknown; error: { code?: string; message?: string } | null };
type LooseBuilder = {
  select(columns: string): LooseBuilder;
  eq(column: string, value: unknown): LooseBuilder;
  in(column: string, values: unknown[]): LooseBuilder;
  insert(values: Record<string, unknown>): LooseBuilder;
  update(values: Record<string, unknown>): LooseBuilder;
  maybeSingle(): LooseBuilder;
};
type LooseClient = { from(table: string): LooseBuilder };

function db(): LooseClient {
  return createAdminClient() as unknown as LooseClient;
}

async function run<T>(query: LooseBuilder): Promise<{ data: T | null; error: LooseResult["error"] }> {
  return (query as unknown as Promise<LooseResult>) as Promise<{ data: T | null; error: LooseResult["error"] }>;
}

function targetFilter(target: LeadUnlockTarget): { column: string; value: string } {
  return "opportunityId" in target
    ? { column: "application_trade_opportunity_id", value: target.opportunityId }
    : { column: "market_signal_trade_match_id", value: target.marketSignalId };
}

export async function findLeadUnlock(companyId: string, target: LeadUnlockTarget): Promise<LeadUnlockRow | null> {
  const filter = targetFilter(target);
  const { data } = await run<LeadUnlockRow>(
    db().from("lead_unlocks").select("*").eq("company_id", companyId).eq(filter.column, filter.value).maybeSingle(),
  );
  return data;
}

export async function findLeadUnlockById(id: string): Promise<LeadUnlockRow | null> {
  const { data } = await run<LeadUnlockRow>(db().from("lead_unlocks").select("*").eq("id", id).maybeSingle());
  return data;
}

export async function listPaidLeadUnlocks(companyId: string): Promise<LeadUnlockRow[]> {
  const builder = db().from("lead_unlocks").select("*").eq("company_id", companyId).eq("status", "paid");
  const { data } = await run<LeadUnlockRow[]>(builder);
  return Array.isArray(data) ? data : [];
}

export async function createLeadUnlockIntent(input: {
  companyId: string;
  userId: string;
  target: LeadUnlockTarget;
}): Promise<{ row: LeadUnlockRow | null; error: { code?: string; message?: string } | null }> {
  const filter = targetFilter(input.target);
  const values: Record<string, unknown> = {
    company_id: input.companyId,
    created_by: input.userId,
    application_trade_opportunity_id: "opportunityId" in input.target ? input.target.opportunityId : null,
    market_signal_trade_match_id: "marketSignalId" in input.target ? input.target.marketSignalId : null,
    amount_pence: LEAD_UNLOCK_AMOUNT_PENCE,
    currency: "gbp",
    status: "pending",
  };

  const { data, error } = await run<LeadUnlockRow>(
    db().from("lead_unlocks").insert(values).select("*").maybeSingle(),
  );
  if (data) return { row: data, error: null };

  // A double click should reuse the existing intent instead of creating two
  // possible charges for the same company/opportunity pair.
  if (error?.code === "23505") {
    const existing = await findLeadUnlock(input.companyId, input.target);
    return { row: existing, error: null };
  }
  return { row: null, error };
}

export async function updateLeadUnlock(id: string, values: Record<string, unknown>): Promise<void> {
  await run(db().from("lead_unlocks").update(values).eq("id", id).select("id").maybeSingle());
}

export function isPaidUnlock(row: LeadUnlockRow | null): boolean {
  return row?.status === "paid";
}
