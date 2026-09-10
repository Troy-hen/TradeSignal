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

type CreateQuoteLinkInput = {
  companyId: string;
  opportunityId: string;
  deliveryId?: string | null;
  channel: ResponseChannel;
  audienceType: ResponseAudience;
  createdBy?: string | null;
};

export async function createQuoteLink(input: CreateQuoteLinkInput) {
  return persistQuoteLink(input, randomToken());
}

/**
 * Postal/email retries need to reproduce the same public URL before the
 * provider's idempotency key can safely replay the exact same content.
 * The token is HMAC-derived from an opaque delivery UUID and workspace data,
 * so it is stable for retries but cannot be guessed without the signing secret.
 */
export async function createOrReuseDeliveryQuoteLink(input: CreateQuoteLinkInput & { deliveryId: string }) {
  const secret = process.env.QUOTE_LINK_SIGNING_SECRET?.trim();
  if (!secret) throw new Error("QUOTE_LINK_SIGNING_SECRET_NOT_CONFIGURED");
  const token = await deterministicDeliveryToken(secret, input);
  return persistQuoteLink(input, token, true);
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
  return bytesToHex(new Uint8Array(digest));
}

export function buildQuoteLinkUrl(token: string) {
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredBase && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL_NOT_CONFIGURED");
  }
  const base = (configuredBase || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/q/${encodeURIComponent(token)}`;
}

async function persistQuoteLink(input: CreateQuoteLinkInput, token: string, allowExisting = false) {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const tokenHash = await hashQuoteLinkToken(token);

  if (allowExisting) {
    const { data: existing } = await admin
      .from("outreach_response_links")
      .select("id,expires_at,status")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (existing) {
      let expiresAt = String(existing.expires_at);
      if (String(existing.status) !== "active" || Date.parse(expiresAt) <= Date.now()) {
        expiresAt = expiryDate();
        const { error } = await admin
          .from("outreach_response_links")
          .update({ status: "active", expires_at: expiresAt, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      }
      return { id: String(existing.id), token, url: buildQuoteLinkUrl(token), expiresAt };
    }
  }

  if (input.deliveryId) {
    await admin
      .from("outreach_response_links")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("outreach_delivery_id", input.deliveryId)
      .eq("status", "active");
  }

  const expiresAt = expiryDate();
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
      expires_at: expiresAt,
    })
    .select("id,expires_at")
    .single();
  if (error || !data) throw error ?? new Error("QuoteLink creation failed");
  return { id: data.id as string, token, url: buildQuoteLinkUrl(token), expiresAt: data.expires_at as string };
}

async function deterministicDeliveryToken(secret: string, input: CreateQuoteLinkInput & { deliveryId: string }) {
  const payload = ["mytradebox-quotelink-v1", input.deliveryId, input.companyId, input.opportunityId, input.channel, input.audienceType].join(":");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function expiryDate() {
  return new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
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
function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function isValidTokenShape(token: string) { return /^[A-Za-z0-9_-]{24,128}$/.test(token); }
