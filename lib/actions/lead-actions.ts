"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";

const actionSchema = z.object({
  leadMatchId: z.string().trim().uuid(),
  actionType: z.enum(["saved", "contacted", "quoted", "won", "lost"]),
  contractValueGbp: z.number().positive().optional(),
  note: z.string().trim().max(2000).optional(),
});

/**
 * Called directly from a Client Component (not a <form action>) since the
 * detail page needs several distinct buttons sharing one handler shape.
 * "viewed" is deliberately not selectable here — the detail page records
 * that itself on first render, not as a user-initiated action.
 */
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

  const { error } = await supabase.from("lead_actions").insert({
    lead_match_id: parsed.data.leadMatchId,
    company_id: company.id,
    action_type: parsed.data.actionType,
    contract_value_gbp: parsed.data.contractValueGbp ?? null,
    note: parsed.data.note ?? null,
  });

  if (error) return { error: "Could not record this action. Please try again." };

  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  revalidatePath("/roi");

  return {};
}
