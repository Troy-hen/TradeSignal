"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";

const actionSchema = z.object({
  leadMatchId: z.string().trim().uuid(),
  actionType: z.enum(["saved", "contacted", "quoted", "won", "lost"]),
  contractValueGbp: z.number().positive().optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function recordLeadAction(input: {
  leadMatchId: string;
  actionType: "saved" | "contacted" | "quoted" | "won" | "lost";
  contractValueGbp?: number;
  note?: string;
}): Promise<{ error?: string }> {
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid action" };

  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const { data: match } = await supabase.from("lead_matches").select("application_trade_opportunity_id").eq("id", parsed.data.leadMatchId).eq("company_id", company.id).maybeSingle();
  if (!match?.application_trade_opportunity_id) return { error: "Opportunity not found" };

  const { error } = await supabase.from("lead_actions").insert({
    lead_match_id: parsed.data.leadMatchId,
    company_id: company.id,
    action_type: parsed.data.actionType,
    contract_value_gbp: parsed.data.contractValueGbp ?? null,
    note: parsed.data.note ?? null,
  });
  if (error) return { error: "Could not record this action. Please try again." };

  const requestStatus = quoteRequestStatus(parsed.data.actionType);
  if (requestStatus) {
    const admin = createAdminClient() as unknown as SupabaseClient;
    const { error: syncError } = await admin
      .from("quote_requests")
      .update({ status: requestStatus, updated_at: new Date().toISOString() })
      .eq("company_id", company.id)
      .eq("opportunity_id", match.application_trade_opportunity_id)
      .in("status", ["new", "contacted", "quote_scheduled", "quoted"]);
    if (syncError) console.error("Quote request workflow sync failed", syncError);
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${match.application_trade_opportunity_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/roi");
  return {};
}

function quoteRequestStatus(action: "saved" | "contacted" | "quoted" | "won" | "lost") {
  if (action === "contacted") return "contacted";
  if (action === "quoted") return "quoted";
  if (action === "won") return "won";
  if (action === "lost") return "lost";
  return null;
}
