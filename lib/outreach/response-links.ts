import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResponseAudience = "homeowner" | "professional" | "business" | "unknown";
export type ResponseChannel = "letter" | "email";
export type QuoteLinkEventType = "page_viewed" | "call_clicked" | "whatsapp_clicked" | "quote_started" | "quote_requested" | "not_interested";

export type ResolvedQuoteLink = {
  id: string;
  companyId: string;
  opportunityId: string;
  deliveryId: string | null;
  channel: ResponseChannel;
  audienceType: ResponseAudience;
  status: string;
  expiresAt: string;
};

export async function createQuoteLink(input: {
  companyId: string;
  opportunityId: string;
  deliveryId?: string | null;
  channel: ResponseChannel;
  audienceType: ResponseAudience;
  createdBy?: string | null;
}) {
  const admin = createAdminClient() as unknown as SupabaseClient;

  if (input.deliveryId) {
    await admin
      .from("outreach_response_links")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("outreach_delivery_id", input.deliveryId)
      .eq("status", "active");
  }

  const token = randomToken();
  const tokenHash = await hashQuoteLinkToken(token);
  const { data, error } = await admin
    .from("outreach_response_links")
    .insert({
      company_id: input.companyId,
      opportunity_id: input.opportunityId,
      outreach_delivery_id: input.deliveryId ?? null,
      channel: input.channel,
      audience_type: input.audienceType,
      token_hash: tokenHash,
      created_by: input.createdBy ?? null,
    })
    .select("id,expires_at")
    .single();
  if (error || !data) throw error ?? new Error("QuoteLink creation failed");

  return {
    id: data.id as string,
    token,
    url: buildQuoteLinkUrl(token),
    expiresAt: data.expires_at as string,
  };
}

export async function resolveQuoteLink(token: string): Promise<ResolvedQuoteLink | null> {
  if (!isValidTokenShape(token)) return null;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const tokenHash = await hashQuoteLinkToken(token);
  const { data, error } = await admin
    .from("outreach_response_links")
    .select("id,company_id,opportunity_id,outreach_delivery_id,channel,audience_type,status,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return null;
  if (["revoked", "expired"].includes(String(data.status))) return null;
  if (Date.parse(String(data.expires_at)) <= Date.now()) {
    await admin.from("outreach_response_links").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", data.id);
    return null;
  }
  return {
    id: data.id as string,
    companyId: data.company_id as string,
    opportunityId: data.opportunity_id as string,
    deliveryId: (data.outreach_delivery_id as string | null) ?? null,
    channel: data.channel as ResponseChannel,
    audienceType: data.audience_type as ResponseAudience,
    status: String(data.status),
    expiresAt: String(data.expires_at),
  };
}

export async function recordQuoteLinkEvent(link: ResolvedQuoteLink, eventType: QuoteLinkEventType, metadata: Record<string, unknown> = {}) {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const now = new Date().toISOString();
  await admin.from("outreach_response_events").insert({
    response_link_id: link.id,
    company_id: link.companyId,
    opportunity_id: link.opportunityId,
    event_type: eventType,
    metadata,
  });

  if (eventType === "page_viewed") {
    const { data: current } = await admin.from("outreach_response_links").select("open_count,first_opened_at").eq("id", link.id).maybeSingle();
    await admin.from("outreach_response_links").update({
      open_count: Number(current?.open_count ?? 0) + 1,
      first_opened_at: current?.first_opened_at ?? now,
      last_opened_at: now,
      updated_at: now,
    }).eq("id", link.id);
  }
}

export async function hashQuoteLinkToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function buildQuoteLinkUrl(token: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/q/${encodeURIComponent(token)}`;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function isValidTokenShape(token: string) {
  return /^[A-Za-z0-9_-]{24,128}$/.test(token);
}
