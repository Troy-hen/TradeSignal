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
  nearbyOpportunityAlertsEnabled: z.boolean(),
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
    nearbyOpportunityAlertsEnabled: formData.get("nearbyOpportunityAlertsEnabled") === "on",
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
    p_nearby_opportunity_alerts_enabled: parsed.data.nearbyOpportunityAlertsEnabled,
  });

  if (error) return { error: "Could not save preferences. Only company owners/admins can edit these." };

  revalidatePath("/settings");
  return { success: true };
}

const leadAlertRuleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  minScore: z.number().min(0).max(100),
  cadence: z.enum(["instant", "daily", "weekly"]),
  signalFamilies: z.string().max(500),
  postcodeDistricts: z.string().max(500),
  buyingWindows: z.string().max(500),
  channelEmail: z.boolean(),
});

type LooseSettingsBuilder = {
  update(values: Record<string, unknown>): LooseSettingsBuilder;
  upsert(values: Record<string, unknown>, options?: Record<string, unknown>): LooseSettingsBuilder;
  select(columns: string): LooseSettingsBuilder;
  maybeSingle(): LooseSettingsBuilder;
  eq(column: string, value: unknown): LooseSettingsBuilder;
};

type LooseSettingsClient = { from(table: string): LooseSettingsBuilder };

async function runLooseSettingsQuery<T>(query: LooseSettingsBuilder) {
  return query as unknown as Promise<{ data: T | null; error: { message?: string } | null }>;
}

function csvValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export async function upsertLeadAlertRule(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = leadAlertRuleSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    name: formData.get("name"),
    minScore: Number(formData.get("minScore")),
    cadence: formData.get("cadence"),
    signalFamilies: String(formData.get("signalFamilies") ?? ""),
    postcodeDistricts: String(formData.get("postcodeDistricts") ?? ""),
    buyingWindows: String(formData.get("buyingWindows") ?? ""),
    channelEmail: formData.get("channelEmail") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid alert rule" };

  const company = await requireCurrentCompany();
  const supabase = (await createClient()) as unknown as LooseSettingsClient;
  const payload = {
    company_id: company.id,
    name: parsed.data.name,
    enabled: true,
    min_score: parsed.data.minScore,
    signal_families: csvValues(parsed.data.signalFamilies),
    postcode_districts: csvValues(parsed.data.postcodeDistricts),
    buying_windows: csvValues(parsed.data.buyingWindows),
    channels: parsed.data.channelEmail ? ["banner", "email"] : ["banner"],
    cadence: parsed.data.cadence,
  };
  const query = parsed.data.id
    ? supabase.from("alert_rules").update(payload).eq("id", parsed.data.id).eq("company_id", company.id).select("id").maybeSingle()
    : supabase.from("alert_rules").upsert(payload, { onConflict: "company_id,name" }).select("id").maybeSingle();
  const { error } = await runLooseSettingsQuery(query);

  if (error) return { error: "Could not save the alert rule. Only company owners/admins can edit these." };
  revalidatePath("/settings");
  return { success: true };
}
