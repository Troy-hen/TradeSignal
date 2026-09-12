"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const db = supabase as unknown as SupabaseClient;
  const { data: entitled } = await db.rpc("get_owned_market_signal", { p_match_id: parsed.data.matchId });
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

  const { error } = await db.from("market_signal_company_states").upsert(row, { onConflict: "company_id,market_signal_trade_match_id" });
  if (error) {
    console.error("market signal action failed", error);
    return { error: "Could not update this opportunity. Please try again." };
  }

  const requestStatus = quoteRequestStatus(parsed.data.action);
  if (requestStatus) {
    const admin = createAdminClient() as unknown as SupabaseClient;
    const { error: syncError } = await admin
      .from("quote_requests")
      .update({ status: requestStatus, updated_at: now })
      .eq("company_id", company.id)
      .eq("market_signal_trade_match_id", parsed.data.matchId)
      .in("status", ["new", "contacted", "quote_scheduled", "quoted"]);
    if (syncError) console.error("Commercial quote request workflow sync failed", syncError);
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/trade/${parsed.data.matchId}`);
  revalidatePath("/dashboard");
  revalidatePath("/roi");
  return {};
}

function quoteRequestStatus(action: "new" | "saved" | "contacted" | "bid_planned" | "bid_submitted" | "quoted" | "won" | "lost") {
  if (action === "contacted") return "contacted";
  if (action === "quoted" || action === "bid_submitted") return "quoted";
  if (action === "won") return "won";
  if (action === "lost") return "lost";
  return null;
}
