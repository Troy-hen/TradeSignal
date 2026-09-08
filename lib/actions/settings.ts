"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";

export type SettingsActionState = { error?: string; success?: boolean } | undefined;

const companyDetailsSchema = z.object({
  tradingName: z.string().trim().min(2, "Enter your company name"),
  billingEmail: z.string().trim().email("Enter a valid billing email"),
});

export async function updateCompanyDetails(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = companyDetailsSchema.safeParse({
    tradingName: formData.get("tradingName"),
    billingEmail: formData.get("billingEmail"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details" };

  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const { error } = await supabase
    .from("companies")
    .update({ trading_name: parsed.data.tradingName, billing_email: parsed.data.billingEmail })
    .eq("id", company.id);

  if (error) return { error: "Could not save changes. Only company owners/admins can edit these details." };

  revalidatePath("/settings");
  return { success: true };
}

const notificationPreferencesSchema = z.object({
  channelEmail: z.boolean(),
  digestFrequency: z.enum(["instant", "daily", "weekly"]),
  instantAlertMinScore: z.number().min(0).max(100),
  digestMinScore: z.number().min(0).max(100),
  approvalAlertsEnabled: z.boolean(),
});

export async function updateNotificationPreferences(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = notificationPreferencesSchema.safeParse({
    channelEmail: formData.get("channelEmail") === "on",
    digestFrequency: formData.get("digestFrequency"),
    instantAlertMinScore: Number(formData.get("instantAlertMinScore")),
    digestMinScore: Number(formData.get("digestMinScore")),
    approvalAlertsEnabled: formData.get("approvalAlertsEnabled") === "on",
  });
  if (!parsed.success) return { error: "Invalid preferences" };

  const company = await requireCurrentCompany();
  const supabase = await createClient();

  // Plain .upsert() can't target notification_preferences' partial unique
  // index (company_id WHERE user_id IS NULL), so this goes through an RPC
  // that does the correctly-qualified ON CONFLICT itself.
  const { error } = await supabase.rpc("upsert_company_notification_preferences", {
    p_company_id: company.id,
    p_channel_email: parsed.data.channelEmail,
    p_digest_frequency: parsed.data.digestFrequency,
    p_instant_alert_min_score: parsed.data.instantAlertMinScore,
    p_digest_min_score: parsed.data.digestMinScore,
    p_approval_alerts_enabled: parsed.data.approvalAlertsEnabled,
  });

  if (error) return { error: "Could not save preferences. Only company owners/admins can edit these." };

  revalidatePath("/settings");
  return { success: true };
}
