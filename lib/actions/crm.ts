"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { findLeadUnlockById, type LeadUnlockRow } from "@/lib/data/lead-unlocks";
import { getMarketSignalForLeadUnlock } from "@/lib/data/trade-intelligence";

export type CrmPushState = { error?: string; success?: boolean; status?: "sent" | "already_sent" } | undefined;

const pushSchema = z.object({
  leadUnlockId: z.string().uuid(),
  connectionId: z.string().uuid(),
});

type LooseResult = { data: unknown; error: { code?: string; message?: string } | null };
type LooseBuilder = {
  select(columns: string): LooseBuilder;
  eq(column: string, value: unknown): LooseBuilder;
  maybeSingle(): LooseBuilder;
  insert(values: Record<string, unknown>): LooseBuilder;
  update(values: Record<string, unknown>): LooseBuilder;
};
type LooseClient = { from(table: string): LooseBuilder };

async function run<T>(query: LooseBuilder): Promise<{ data: T | null; error: LooseResult["error"] }> {
  return query as unknown as Promise<{ data: T | null; error: LooseResult["error"] }>;
}

/**
 * Delivers one purchased lead exactly once to a connected CRM endpoint.
 * Provider-specific OAuth adapters can use the same normalized payload and
 * delivery log when their credentials are added; this path is already useful
 * for a CRM, automation platform or internal endpoint via generic webhook.
 */
export async function pushLeadToCrm(
  _previous: CrmPushState,
  formData: FormData,
): Promise<CrmPushState> {
  const parsed = pushSchema.safeParse({
    leadUnlockId: formData.get("leadUnlockId"),
    connectionId: formData.get("connectionId"),
  });
  if (!parsed.success) return { error: "Choose a valid CRM connection." };

  const company = await requireCurrentCompany();
  const unlock = await findLeadUnlockById(parsed.data.leadUnlockId);
  if (!unlock || unlock.company_id !== company.id || unlock.status !== "paid") {
    return { error: "Only purchased leads can be sent to a CRM." };
  }

  const sessionClient = (await createClient()) as unknown as LooseClient;
  const { data: connection, error: connectionError } = await run<{
    id: string;
    provider: string;
    label: string;
    status: string;
    config: Record<string, unknown>;
    secret_ref: string | null;
  }>(
    sessionClient.from("crm_connections").select("id, provider, label, status, config, secret_ref").eq("id", parsed.data.connectionId).eq("company_id", company.id).maybeSingle(),
  );
  if (connectionError || !connection || connection.status !== "connected") {
    return { error: "That CRM connection is not connected. Review it in Settings." };
  }

  const idempotencyKey = `lead:${unlock.id}`;
  const admin = createAdminClient() as unknown as LooseClient;
  const { data: existing } = await run<{ id: string; status: string }>(
    admin.from("crm_delivery_log").select("id, status").eq("connection_id", connection.id).eq("idempotency_key", idempotencyKey).maybeSingle(),
  );
  if (existing?.status === "sent") return { success: true, status: "already_sent" };

  const payload = await buildLeadPayload(unlock, company.id, connection.id, sessionClient);
  if (!payload) return { error: "The purchased lead is still being assembled. Try again shortly." };

  const { data: delivery, error: deliveryError } = await run<{ id: string }>(
    admin.from("crm_delivery_log").insert({
      company_id: company.id,
      connection_id: connection.id,
      lead_unlock_id: unlock.id,
      idempotency_key: idempotencyKey,
      status: "sending",
      request_metadata: { provider: connection.provider, fields: Object.keys(payload) },
      attempted_at: new Date().toISOString(),
    }).select("id").maybeSingle(),
  );
  if (deliveryError && deliveryError.code !== "23505") {
    console.error("CRM delivery log insert failed", deliveryError);
    return { error: "Could not start CRM delivery. Please try again." };
  }
  if (!delivery && deliveryError?.code === "23505") {
    const { data: retryExisting } = await run<{ id: string; status: string }>(
      admin.from("crm_delivery_log").select("id, status").eq("connection_id", connection.id).eq("idempotency_key", idempotencyKey).maybeSingle(),
    );
    if (retryExisting?.status === "sent") return { success: true, status: "already_sent" };
    if (retryExisting?.status === "sending") return { error: "This lead is already being sent to the CRM." };
  }

  if (connection.provider !== "generic_webhook") {
    await markDeliveryFailed(admin, company.id, connection.id, idempotencyKey, "This provider adapter is not configured yet. Use Generic webhook or finish the provider API setup in Settings.");
    return { error: "This provider adapter is not configured yet. Use Generic webhook or finish the provider API setup in Settings." };
  }

  const webhookUrl = typeof connection.config?.webhook_url === "string" ? connection.config.webhook_url : "";
  if (!webhookUrl || !/^https:\/\//i.test(webhookUrl) || isUnsafeWebhookUrl(webhookUrl)) {
    await markDeliveryFailed(admin, company.id, connection.id, idempotencyKey, "Add an HTTPS webhook URL to this connection in Settings.");
    return { error: "Add an HTTPS webhook URL to this connection in Settings." };
  }

  const headers: Record<string, string> = { "content-type": "application/json", "x-everro-idempotency-key": idempotencyKey };
  if (connection.secret_ref) {
    const secret = process.env[connection.secret_ref];
    if (secret) headers.authorization = `Bearer ${secret}`;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    const responseText = await response.text().catch(() => "");
    if (!response.ok) throw new Error(`Webhook returned ${response.status}${responseText ? `: ${responseText.slice(0, 160)}` : ""}`);
    await admin.from("crm_delivery_log").update({ status: "sent", sent_at: new Date().toISOString(), response_metadata: { status: response.status } }).eq("company_id", company.id).eq("connection_id", connection.id).eq("idempotency_key", idempotencyKey);
    await admin.from("crm_connections").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", connection.id).eq("company_id", company.id);
    revalidatePath("/purchased");
    revalidatePath("/settings");
    return { success: true, status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook delivery failed";
    await markDeliveryFailed(admin, company.id, connection.id, idempotencyKey, message);
    return { error: "CRM delivery failed. Check the connection in Settings and try again." };
  }
}

function isUnsafeWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol !== "https:" || host === "localhost" || host === "::1" || host === "0.0.0.0" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  } catch {
    return true;
  }
}

async function markDeliveryFailed(admin: LooseClient, companyId: string, connectionId: string, idempotencyKey: string, message: string) {
  await admin.from("crm_delivery_log").update({ status: "failed", error_message: message }).eq("company_id", companyId).eq("connection_id", connectionId).eq("idempotency_key", idempotencyKey);
}

async function buildLeadPayload(unlock: LeadUnlockRow, companyId: string, connectionId: string, sessionClient: LooseClient): Promise<Record<string, unknown> | null> {
  const base: Record<string, unknown> = {
    everro_lead_id: unlock.id,
    company_id: companyId,
    unlocked_at: unlock.unlocked_at,
    unlock_amount_gbp: Number(unlock.amount_pence) / 100,
  };
  if (unlock.application_trade_opportunity_id) {
    const admin = createAdminClient() as unknown as LooseClient;
    const { data: opportunity } = await run<Record<string, unknown>>(
      admin.from("application_trade_opportunities").select("id, planning_application_id, opportunity_score, opportunity_bucket, estimated_trade_value_low, estimated_trade_value_high, recommended_action, postcode_district, likely_scope").eq("id", unlock.application_trade_opportunity_id).maybeSingle(),
    );
    if (!opportunity) return null;
    const { data: application } = await run<Record<string, unknown>>(
      admin.from("planning_applications").select("applicant_name, agent_company, address_text, local_planning_authority, source_url, proposal_description").eq("id", opportunity.planning_application_id).maybeSingle(),
    );
    const payload = {
      ...base,
      lead_type: "planning_opportunity",
      title: opportunity.proposal_description ?? "Everro opportunity",
      company_name: application?.applicant_name ?? null,
      contact_name: application?.agent_company ?? null,
      email: null,
      phone: null,
      location: application?.address_text ?? opportunity.postcode_district,
      postcode_district: opportunity.postcode_district,
      score: opportunity.opportunity_score,
      stage: "purchased",
      value_low_gbp: opportunity.estimated_trade_value_low,
      value_high_gbp: opportunity.estimated_trade_value_high,
      summary: opportunity.recommended_action,
      likely_needs: opportunity.likely_scope,
      source_url: application?.source_url ?? null,
    };
    return applyFieldMappings(payload, await listFieldMappings(sessionClient, connectionId));
  }
  if (unlock.market_signal_trade_match_id) {
    const signal = await getMarketSignalForLeadUnlock(unlock.market_signal_trade_match_id);
    if (!signal) return null;
    const contact = signal.contact ?? {};
    const payload = {
      ...base,
      lead_type: "market_signal",
      title: signal.title,
      company_name: signal.buyer_name ?? signal.supplier_name,
      contact_name: typeof contact.name === "string" ? contact.name : null,
      email: typeof contact.email === "string" ? contact.email : null,
      phone: typeof contact.telephone === "string" ? contact.telephone : null,
      location: signal.location_text ?? signal.postcode_district,
      postcode_district: signal.postcode_district,
      score: signal.fit_score,
      stage: signal.procurement_stage,
      value_low_gbp: signal.estimated_trade_value_low,
      value_high_gbp: signal.estimated_trade_value_high,
      summary: signal.recommended_action ?? signal.summary,
      source: signal.source,
      source_url: signal.source_url,
    };
    return applyFieldMappings(payload, await listFieldMappings(sessionClient, connectionId));
  }
  return null;
}

async function listFieldMappings(client: LooseClient, connectionId: string) {
  const { data } = await run<Array<{ everro_field: string; remote_field: string }>>(
    client.from("crm_field_mappings").select("everro_field, remote_field").eq("connection_id", connectionId),
  );
  return data ?? [];
}

function applyFieldMappings(payload: Record<string, unknown>, mappings: Array<{ everro_field: string; remote_field: string }>) {
  if (mappings.length === 0) return payload;
  const mapped: Record<string, unknown> = { everro_lead_id: payload.everro_lead_id };
  for (const mapping of mappings) {
    if (!mapping.everro_field || !mapping.remote_field) continue;
    mapped[mapping.remote_field] = payload[mapping.everro_field] ?? null;
  }
  return mapped;
}
