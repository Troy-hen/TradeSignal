"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";

const schema = z.object({
  matchId: z.string().uuid(),
  action: z.enum(["new", "saved", "contacted", "bid_planned", "bid_submitted", "quoted", "won", "lost"]),
  contractValueGbp: z.number().positive().optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function recordMarketSignalAction(input: {
  matchId: string;
  action: "new" | "saved" | "contacted" | "bid_planned" | "bid_submitted" | "quoted" | "won" | "lost";
  contractValueGbp?: number;
  note?: string;
}): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid action" };

  const company = await requireCurrentCompany();
  const supabase = await createClient();

  // Entitlement is resolved by the RLS-backed detail function: if the company
  // does not own the signal's district/trade combination this returns no row.
  const { data: entitled } = await supabase.rpc("get_owned_market_signal", { p_match_id: parsed.data.matchId });
  if (!Array.isArray(entitled) || entitled.length === 0) return { error: "This opportunity is not available in your coverage." };

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    company_id: company.id,
    market_signal_trade_match_id: parsed.data.matchId,
    current_action: parsed.data.action,
    contract_value_gbp: parsed.data.contractValueGbp ?? null,
    note: parsed.data.note ?? null,
    updated_at: now,
  };
  if (parsed.data.action === "contacted") row.contacted_at = now;
  if (parsed.data.action === "quoted") row.quoted_at = now;
  if (parsed.data.action === "won") row.won_at = now;
  if (parsed.data.action === "lost") row.lost_at = now;

  const { error } = await supabase
    .from("market_signal_company_states")
    .upsert(row, { onConflict: "company_id,market_signal_trade_match_id" });
  if (error) {
    console.error("market signal action failed", error);
    return { error: "Could not update this opportunity. Please try again." };
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/trade/${parsed.data.matchId}`);
  revalidatePath("/dashboard");
  revalidatePath("/roi");
  return {};
}
