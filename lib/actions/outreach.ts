"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";

export interface OutreachUsage {
  used_generations: number;
  remaining_generations: number;
  daily_used: number;
  daily_remaining: number;
  monthly_used: number;
  monthly_remaining: number;
}

export interface OutreachContent {
  intro_letter: string;
  phone_opener: string;
  doorstep_script: string;
  usage?: Pick<OutreachUsage, "used_generations" | "remaining_generations">;
}

type OutreachStatusRow = {
  used_generations: number;
  remaining_generations: number;
  daily_used: number;
  daily_remaining: number;
  monthly_used: number;
  monthly_remaining: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getOutreachStatus(opportunityId: string): Promise<{ data?: OutreachUsage; error?: string }> {
  if (!UUID_PATTERN.test(opportunityId)) return { error: "Invalid opportunity." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_outreach_generation_status", { p_opportunity_id: opportunityId });
  if (error) return { error: "Could not load outreach usage." };

  const row = (Array.isArray(data) ? data[0] : data) as OutreachStatusRow | null;
  if (!row) return { error: "Could not load outreach usage." };

  return {
    data: {
      used_generations: Number(row.used_generations ?? 0),
      remaining_generations: Number(row.remaining_generations ?? 0),
      daily_used: Number(row.daily_used ?? 0),
      daily_remaining: Number(row.daily_remaining ?? 0),
      monthly_used: Number(row.monthly_used ?? 0),
      monthly_remaining: Number(row.monthly_remaining ?? 0),
    },
  };
}

export async function generateOutreach(opportunityId: string): Promise<{ data?: OutreachContent; error?: string }> {
  if (!UUID_PATTERN.test(opportunityId)) return { error: "Invalid opportunity." };
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;

  const { data, error } = await supabase.functions.invoke("generate-outreach", { body: { opportunity_id: opportunityId } });
  if (error) return { error: "Could not generate outreach copy. Please try again." };

  if (!data?.ok) {
    const message =
      data?.error === "provider_not_configured"
        ? "The outreach assistant isn't configured yet."
        : data?.error === "not_found"
          ? "Could not find this opportunity."
          : data?.error === "usage_limit"
            ? data?.reason === "opportunity_limit"
              ? "You've used both outreach drafts for this opportunity."
              : data?.reason === "daily_limit"
                ? "Your workspace has reached today's outreach limit."
                : data?.reason === "monthly_limit"
                  ? "Your workspace has reached this month's outreach limit."
                  : "Outreach generation is temporarily limited."
            : "Could not generate outreach copy. Please try again.";
    return { error: message };
  }

  try {
    const [{ data: userData }, { data: match }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("lead_match_current_state")
        .select("lead_match_id")
        .eq("application_trade_opportunity_id", opportunityId)
        .eq("company_id", company.id)
        .maybeSingle(),
    ]);
    await db.from("opportunity_activity_events").insert({
      company_id: company.id,
      opportunity_id: opportunityId,
      lead_match_id: match?.lead_match_id ?? null,
      event_type: "outreach_generated",
      channel: "assistant",
      metadata: { formats: ["letter", "phone_opener", "doorstep_script"] },
      created_by: userData.user?.id ?? null,
    });
  } catch {
    // Attribution is best-effort and must never block the generated content.
  }

  return {
    data: {
      intro_letter: data.intro_letter,
      phone_opener: data.phone_opener,
      doorstep_script: data.doorstep_script,
      usage:
        data.usage && typeof data.usage.used_generations === "number" && typeof data.usage.remaining_generations === "number"
          ? { used_generations: data.usage.used_generations, remaining_generations: data.usage.remaining_generations }
          : undefined,
    },
  };
}
