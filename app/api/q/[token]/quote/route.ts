import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashQuoteLinkToken, resolveQuoteLink } from "@/lib/outreach/response-links";

const PERMISSION_VERSION = "project-contact-v1";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().max(254).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  preferredContactMethod: z.enum(["phone", "email", "either"]),
  message: z.string().trim().max(1500).optional().default(""),
  permissionAccepted: z.literal(true),
}).superRefine((value, ctx) => {
  if (!value.email && !value.phone) ctx.addIssue({ code: "custom", message: "contact_required" });
  if (value.email && !z.string().email().safeParse(value.email).success) ctx.addIssue({ code: "custom", message: "invalid_email", path: ["email"] });
  if (value.preferredContactMethod === "email" && !value.email) ctx.addIssue({ code: "custom", message: "email_required", path: ["email"] });
  if (value.preferredContactMethod === "phone" && !value.phone) ctx.addIssue({ code: "custom", message: "phone_required", path: ["phone"] });
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const permissionMissing = parsed.error.issues.some((issue) => issue.path.includes("permissionAccepted"));
    return NextResponse.json({ error: permissionMissing ? "permission_required" : "invalid_request" }, { status: 400 });
  }

  const link = await resolveQuoteLink(token);
  if (!link) return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
  if (link.status === "opted_out") return NextResponse.json({ error: "link_opted_out" }, { status: 409 });

  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: company } = await admin.from("companies").select("trading_name").eq("id", link.companyId).maybeSingle();
  if (!company?.trading_name) return NextResponse.json({ error: "company_not_found" }, { status: 404 });

  const permissionText = `I'd like ${company.trading_name} to contact me about this project using the contact details I've provided.`;
  const { data, error } = await admin.rpc("submit_quote_link_response", {
    p_token_hash: await hashQuoteLinkToken(token),
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone,
    p_preferred_contact_method: parsed.data.preferredContactMethod,
    p_message: parsed.data.message,
    p_permission_text_version: PERMISSION_VERSION,
    p_permission_text: permissionText,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("link_opted_out")) return NextResponse.json({ error: "link_opted_out" }, { status: 409 });
    if (message.includes("invalid_or_expired_link")) return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
    console.error("QuoteLink submission failed", error);
    return NextResponse.json({ error: "quote_request_failed" }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return NextResponse.json({ error: "quote_request_failed" }, { status: 500 });

  if (!result.already_submitted) {
    const now = new Date().toISOString();
    await Promise.all([
      admin.from("opportunity_activity_events").insert({
        company_id: result.company_id,
        opportunity_id: result.opportunity_id,
        lead_match_id: result.lead_match_id ?? null,
        event_type: "quote_requested",
        channel: link.channel,
        metadata: {
          quote_request_id: result.quote_request_id,
          response_link_id: link.id,
          audience_type: result.audience_type,
          preferred_contact_method: parsed.data.preferredContactMethod,
        },
      }),
      admin.from("notification_log").insert({
        company_id: result.company_id,
        lead_match_id: result.lead_match_id ?? null,
        notification_type: "quote_request",
        status: "sent",
        subject: "New quote request",
        sent_at: now,
        metadata: {
          opportunity_id: result.opportunity_id,
          quote_request_id: result.quote_request_id,
          audience_type: result.audience_type,
          responder_name: parsed.data.name,
          preferred_contact_method: parsed.data.preferredContactMethod,
          channel: "in_app",
        },
      }),
    ]);
  }

  return NextResponse.json({ ok: true, quoteRequestId: result.quote_request_id, alreadySubmitted: Boolean(result.already_submitted) });
}
