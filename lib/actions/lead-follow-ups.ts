"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";

export type LeadFollowUp = {
  id: string;
  lead_match_id: string;
  company_id: string;
  due_at: string;
  note: string | null;
  status: "open" | "completed" | "cancelled";
  completed_at: string | null;
  created_at: string;
};

type RpcResponse<T> = {
  data: T | T[] | null;
  error: { message?: string } | null;
};

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResponse<unknown>>;
};

const createSchema = z.object({
  leadMatchId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  dueAt: z.string().datetime({ offset: true }),
  note: z.string().trim().max(2000).optional(),
});

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? ((data[0] as T | undefined) ?? null) : data;
}

export async function listLeadFollowUps(leadMatchId: string): Promise<LeadFollowUp[]> {
  const parsed = z.string().uuid().safeParse(leadMatchId);
  if (!parsed.success) return [];

  await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as RpcClient;
  const { data, error } = await db.rpc("list_lead_follow_ups", { p_lead_match_id: parsed.data });
  if (error || !data) return [];
  return (Array.isArray(data) ? data : [data]) as LeadFollowUp[];
}

export async function createLeadFollowUp(input: {
  leadMatchId: string;
  opportunityId: string;
  dueAt: string;
  note?: string;
}): Promise<{ data?: LeadFollowUp; error?: string }> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Choose a future reminder date and time." };

  await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as RpcClient;
  const { data, error } = await db.rpc("create_lead_follow_up", {
    p_lead_match_id: parsed.data.leadMatchId,
    p_due_at: parsed.data.dueAt,
    p_note: parsed.data.note ?? null,
  });

  if (error) {
    return {
      error: error.message?.includes("invalid_due_at")
        ? "Choose a reminder within the next year."
        : "Could not save this follow-up. Please try again.",
    };
  }

  revalidatePath("/opportunities/" + parsed.data.opportunityId);
  revalidatePath("/opportunities");
  return { data: firstRow(data) as LeadFollowUp | null ?? undefined };
}

export async function completeLeadFollowUp(input: {
  followUpId: string;
  opportunityId: string;
}): Promise<{ error?: string }> {
  const parsed = z.object({ followUpId: z.string().uuid(), opportunityId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: "Invalid follow-up." };

  await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as RpcClient;
  const { error } = await db.rpc("complete_lead_follow_up", { p_follow_up_id: parsed.data.followUpId });
  if (error) return { error: "Could not complete this follow-up." };

  revalidatePath("/opportunities/" + parsed.data.opportunityId);
  revalidatePath("/opportunities");
  return {};
}

export async function cancelLeadFollowUp(input: {
  followUpId: string;
  opportunityId: string;
}): Promise<{ error?: string }> {
  const parsed = z.object({ followUpId: z.string().uuid(), opportunityId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: "Invalid follow-up." };

  await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as RpcClient;
  const { error } = await db.rpc("cancel_lead_follow_up", { p_follow_up_id: parsed.data.followUpId });
  if (error) return { error: "Could not cancel this follow-up." };

  revalidatePath("/opportunities/" + parsed.data.opportunityId);
  revalidatePath("/opportunities");
  return {};
}
