"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { isUnsafeWebhookUrl } from "@/lib/crm/webhook-security";

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

const crmConnectionSchema = z.object({
  label: z.string().trim().min(2).max(80),
  webhookUrl: z.string().trim().url("Enter a valid HTTPS webhook URL").refine((value) => value.startsWith("https://"), "Webhook URL must use HTTPS"),
  secretRef: z.string().trim().regex(/^[A-Z][A-Z0-9_]*$/, "Use an uppercase managed-secret reference, for example CRM_WEBHOOK_SECRET").optional().or(z.literal("")),
});

export async function createGenericWebhookConnection(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = crmConnectionSchema.safeParse({
    label: formData.get("label"),
    webhookUrl: formData.get("webhookUrl"),
    secretRef: String(formData.get("secretRef") ?? "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid CRM connection" };

  const company = await requireCurrentCompany();
  const supabase = (await createClient()) as unknown as LooseSettingsClient;
  const { data: savedConnection, error } = await runLooseSettingsQuery<{ id: string }>(
    supabase.from("crm_connections").upsert({
      company_id: company.id,
      provider: "generic_webhook",
      label: parsed.data.label,
      // Do not claim a connector is usable until its endpoint has answered a
      // connection test from Settings.
      status: "pending",
      config: { webhook_url: parsed.data.webhookUrl },
      secret_ref: parsed.data.secretRef || null,
      last_connected_at: null,
      last_error: null,
    }, { onConflict: "company_id,provider,label" }).select("id").maybeSingle(),
  );
  if (error) return { error: "Could not save this CRM connection. Check your permissions and try again." };
  if (savedConnection?.id) {
    const defaultFields = ["title", "company_name", "contact_name", "email", "phone", "location", "postcode_district", "score", "stage", "value_low_gbp", "value_high_gbp", "summary", "source_url"];
    for (const field of defaultFields) {
      await runLooseSettingsQuery(supabase.from("crm_field_mappings").upsert({ connection_id: savedConnection.id, everro_field: field, remote_field: field, required: ["title", "company_name"].includes(field) }, { onConflict: "connection_id,everro_field" }).select("id").maybeSingle());
    }
  }
  revalidatePath("/settings");
  revalidatePath("/purchased");
  return { success: true };
}

const managedCrmConnectionSchema = crmConnectionSchema.extend({ connectionId: z.string().uuid() });

export async function updateGenericWebhookConnection(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = managedCrmConnectionSchema.safeParse({
    connectionId: formData.get("connectionId"),
    label: formData.get("label"),
    webhookUrl: formData.get("webhookUrl"),
    secretRef: String(formData.get("secretRef") ?? "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid CRM connection" };

  const company = await requireCurrentCompany();
  const supabase = (await createClient()) as unknown as LooseSettingsClient;
  const { error } = await runLooseSettingsQuery(
    supabase.from("crm_connections").update({
      label: parsed.data.label,
      config: { webhook_url: parsed.data.webhookUrl },
      secret_ref: parsed.data.secretRef || null,
      status: "pending",
      last_connected_at: null,
      last_error: null,
    }).eq("id", parsed.data.connectionId).eq("company_id", company.id).select("id").maybeSingle(),
  );
  if (error) return { error: "Could not update this CRM connection. Check the details and try again." };

  revalidatePath("/settings");
  revalidatePath("/purchased");
  return { success: true };
}

type CrmConnectionQuery = {
  select(columns: string): CrmConnectionQuery;
  eq(column: string, value: unknown): CrmConnectionQuery;
  maybeSingle(): CrmConnectionQuery;
  update(values: Record<string, unknown>): CrmConnectionQuery;
};
type CrmConnectionClient = { from(table: string): CrmConnectionQuery };

async function runCrmConnectionQuery<T>(query: CrmConnectionQuery) {
  return query as unknown as Promise<{ data: T | null; error: { message?: string } | null }>;
}

export async function disconnectCrmConnection(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const connectionId = String(formData.get("connectionId") ?? "");
  if (!z.string().uuid().safeParse(connectionId).success) return { error: "Invalid CRM connection." };

  const company = await requireCurrentCompany();
  const supabase = (await createClient()) as unknown as CrmConnectionClient;
  const { error } = await runCrmConnectionQuery(
    supabase.from("crm_connections").update({ status: "disconnected", last_error: null }).eq("id", connectionId).eq("company_id", company.id).select("id").maybeSingle(),
  );
  if (error) return { error: "Could not disconnect this CRM connection." };

  revalidatePath("/settings");
  revalidatePath("/purchased");
  return { success: true };
}

export async function testGenericWebhookConnection(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const connectionId = String(formData.get("connectionId") ?? "");
  if (!z.string().uuid().safeParse(connectionId).success) return { error: "Invalid CRM connection." };

  const company = await requireCurrentCompany();
  const sessionClient = (await createClient()) as unknown as CrmConnectionClient;
  const { data: connection, error: lookupError } = await runCrmConnectionQuery<{
    id: string;
    provider: string;
    config: Record<string, unknown> | null;
    secret_ref: string | null;
  }>(sessionClient.from("crm_connections").select("id, provider, config, secret_ref").eq("id", connectionId).eq("company_id", company.id).maybeSingle());
  if (lookupError || !connection) return { error: "CRM connection not found." };
  if (connection.provider !== "generic_webhook") return { error: "This provider adapter is not available yet." };

  const webhookUrl = typeof connection.config?.webhook_url === "string" ? connection.config.webhook_url : "";
  if (!webhookUrl || !/^https:\/\//i.test(webhookUrl) || isUnsafeWebhookUrl(webhookUrl)) return { error: "Add a public HTTPS webhook URL before testing." };

  const headers: Record<string, string> = { "content-type": "application/json", "x-everro-connection-test": "true" };
  if (connection.secret_ref) {
    const secret = process.env[connection.secret_ref];
    if (secret) headers.authorization = `Bearer ${secret}`;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ event: "everro.connection_test", connection_id: connection.id, sent_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Endpoint returned ${response.status}`);

    const supabase = (await createClient()) as unknown as CrmConnectionClient;
    await supabase.from("crm_connections").update({ status: "connected", last_connected_at: new Date().toISOString(), last_error: null }).eq("id", connection.id).eq("company_id", company.id);
    revalidatePath("/settings");
    revalidatePath("/purchased");
    return { success: true };
  } catch {
    const supabase = (await createClient()) as unknown as CrmConnectionClient;
    await supabase.from("crm_connections").update({ status: "error", last_error: "Connection test failed. Check the endpoint and secret reference." }).eq("id", connection.id).eq("company_id", company.id);
    revalidatePath("/settings");
    return { error: "Connection test failed. Check the endpoint and secret reference." };
  }
}

export async function saveCrmFieldMappings(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const connectionId = String(formData.get("connectionId") ?? "");
  if (!z.string().uuid().safeParse(connectionId).success) return { error: "Invalid CRM connection." };
  let mappings: unknown;
  try { mappings = JSON.parse(String(formData.get("mappings") ?? "[]")); } catch { return { error: "Invalid field mapping payload." }; }
  const parsed = z.array(z.object({ everroField: z.string().trim().min(1).max(80), remoteField: z.string().trim().min(1).max(120) })).max(50).safeParse(mappings);
  if (!parsed.success) return { error: "Each mapping needs an Everro field and a CRM field." };
  const company = await requireCurrentCompany();
  const supabase = (await createClient()) as unknown as LooseSettingsClient;
  const connectionCheck = await runLooseSettingsQuery<{ id: string }>(supabase.from("crm_connections").select("id").eq("id", connectionId).eq("company_id", company.id).maybeSingle());
  if (!connectionCheck.data) return { error: "CRM connection not found." };
  for (const mapping of parsed.data) {
    const result = await runLooseSettingsQuery(supabase.from("crm_field_mappings").upsert({ connection_id: connectionId, everro_field: mapping.everroField, remote_field: mapping.remoteField }, { onConflict: "connection_id,everro_field" }).select("id").maybeSingle());
    if (result.error) return { error: "Could not save all field mappings." };
  }
  revalidatePath("/settings");
  return { success: true };
}
