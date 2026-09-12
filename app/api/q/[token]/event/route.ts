import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashQuoteLinkToken, recordQuoteLinkEvent, resolveQuoteLink } from "@/lib/outreach/response-links";

const schema = z.object({
  eventType: z.enum(["page_viewed", "call_clicked", "whatsapp_clicked", "quote_started", "not_interested"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const link = await resolveQuoteLink(token);
  if (!link) return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });

  if (body.data.eventType === "not_interested") {
    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin.rpc("opt_out_quote_link", {
      p_token_hash: await hashQuoteLinkToken(token),
      p_reason: "not_interested",
    });
    if (error) {
      const message = String(error.message ?? "");
      if (message.includes("already_responded")) return NextResponse.json({ error: "already_responded" }, { status: 409 });
      return NextResponse.json({ error: "opt_out_failed" }, { status: 400 });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (result && !result.already_opted_out) {
      await admin.from("opportunity_activity_events").insert({
        company_id: result.company_id,
        opportunity_id: result.opportunity_id,
        event_type: "outreach_opted_out",
        channel: link.channel,
        metadata: { response_link_id: result.response_link_id, audience_type: link.audienceType },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (link.status === "opted_out") return NextResponse.json({ ok: true });
  await recordQuoteLinkEvent(link, body.data.eventType, { audience_type: link.audienceType, channel: link.channel });
  return NextResponse.json({ ok: true });
}
