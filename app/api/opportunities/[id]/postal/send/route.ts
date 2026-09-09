import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPostalOpportunityContext } from "@/lib/outreach/postal-context";
import { getPostalOutreachProvider } from "@/lib/outreach/postal-provider";
import { createOrReuseDeliveryQuoteLink } from "@/lib/outreach/response-links";

const bodySchema = z.object({
  content: z.string().trim().min(20).max(12000),
  deliveryId: z.string().uuid(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const company = await requireCurrentCompany();
  const { id } = await params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const provider = getPostalOutreachProvider();
  if (!provider) return NextResponse.json({ error: "postal_provider_not_configured" }, { status: 503 });
  if (!process.env.QUOTE_LINK_SIGNING_SECRET?.trim()) {
    return NextResponse.json({ error: "quote_link_signing_secret_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const context = await getPostalOpportunityContext(id);
  if (!context) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!context.recipient) return NextResponse.json({ error: "postal_address_unavailable" }, { status: 422 });

  const { data: leadMatch } = await db
    .from("lead_matches")
    .select("id")
    .eq("company_id", company.id)
    .eq("application_trade_opportunity_id", id)
    .maybeSingle();

  try {
    const validation = await provider.validateAddress(context.recipient);
    if (!validation.valid) return NextResponse.json({ error: "postal_address_not_validated" }, { status: 422 });
    const recipient = validation.normalized ?? context.recipient;

    const { data: existing } = await admin
      .from("outreach_deliveries")
      .select("id,provider_job_id,status,cost_pence,tracking_url,content_snapshot")
      .eq("id", body.data.deliveryId)
      .eq("company_id", company.id)
      .eq("opportunity_id", id)
      .maybeSingle();

    if (existing?.provider_job_id && ["queued", "sent", "delivered"].includes(existing.status)) {
      return NextResponse.json({
        deliveryId: existing.id,
        provider: provider.name,
        status: existing.status,
        costPence: existing.cost_pence ?? null,
        trackingUrl: existing.tracking_url ?? null,
        idempotentReplay: true,
      });
    }

    if (!existing) {
      const { error: insertError } = await admin
        .from("outreach_deliveries")
        .insert({
          id: body.data.deliveryId,
          company_id: company.id,
          opportunity_id: id,
          lead_match_id: leadMatch?.id ?? null,
          channel: "letter",
          provider: provider.name,
          status: "draft",
          recipient_name: recipient.name ?? context.strategy.suggestedRecipient,
          recipient_address: recipient,
          content_snapshot: body.data.content,
          audience_type: "homeowner",
          strategy_key: "planning-homeowner-introduction",
          template_key: "mytradebox-quote-link-letter",
          template_version: "1",
          created_by: user.id,
        });
      if (insertError) return NextResponse.json({ error: "delivery_create_failed" }, { status: 500 });
    }

    const quoteLink = await createOrReuseDeliveryQuoteLink({
      companyId: company.id,
      opportunityId: id,
      deliveryId: body.data.deliveryId,
      channel: "letter",
      audienceType: "homeowner",
      createdBy: user.id,
    });
    const finalContent = appendQuoteLink(body.data.content, quoteLink.url);

    if (existing?.content_snapshot && !contentIsCompatible(existing.content_snapshot, body.data.content, finalContent)) {
      return NextResponse.json({ error: "delivery_content_mismatch" }, { status: 409 });
    }

    await admin
      .from("outreach_deliveries")
      .update({
        content_snapshot: finalContent,
        audience_type: "homeowner",
        strategy_key: "planning-homeowner-introduction",
        template_key: "mytradebox-quote-link-letter",
        template_version: "1",
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.data.deliveryId)
      .eq("company_id", company.id);

    const result = await provider.sendLetter({
      deliveryId: body.data.deliveryId,
      recipient,
      content: finalContent,
      reference: `opportunity-${id}`,
    });
    const now = new Date().toISOString();

    const { error: updateError } = await admin
      .from("outreach_deliveries")
      .update({
        provider_job_id: result.providerJobId,
        status: result.status,
        cost_pence: result.costPence ?? null,
        tracking_url: result.trackingUrl ?? null,
        sent_at: result.status === "sent" ? now : null,
        updated_at: now,
      })
      .eq("id", body.data.deliveryId)
      .eq("company_id", company.id);
    if (updateError) throw updateError;

    const { data: priorEvent } = await admin
      .from("opportunity_activity_events")
      .select("id")
      .eq("company_id", company.id)
      .eq("provider_reference", result.providerJobId)
      .in("event_type", ["letter_sent", "letter_queued"])
      .limit(1)
      .maybeSingle();

    if (!priorEvent) {
      await admin.from("opportunity_activity_events").insert({
        company_id: company.id,
        opportunity_id: id,
        lead_match_id: leadMatch?.id ?? null,
        event_type: result.status === "sent" ? "letter_sent" : "letter_queued",
        channel: "letter",
        provider: provider.name,
        provider_reference: result.providerJobId,
        metadata: {
          delivery_id: body.data.deliveryId,
          cost_pence: result.costPence ?? null,
          response_link_id: quoteLink.id,
          response_url: quoteLink.url,
          audience_type: "homeowner",
          strategy_key: "planning-homeowner-introduction",
          template_key: "mytradebox-quote-link-letter",
          template_version: "1",
        },
        created_by: user.id,
      });
    }

    return NextResponse.json({
      deliveryId: body.data.deliveryId,
      provider: provider.name,
      status: result.status,
      costPence: result.costPence ?? null,
      trackingUrl: result.trackingUrl ?? null,
      responseUrl: quoteLink.url,
    });
  } catch (error) {
    console.error("Postal send failed", error);
    return NextResponse.json({ error: "postal_send_failed" }, { status: 502 });
  }
}

function appendQuoteLink(content: string, url: string) {
  if (content.includes(url)) return content;
  return `${content.trim()}\n\n────────────────────────\nWant to discuss the project or request a quote?\n${url}\n\nYou can use this private MyTradeBox response link to call, WhatsApp or request a quote directly.`;
}

function contentIsCompatible(stored: string, requested: string, finalContent: string) {
  return stored === requested || stored === finalContent || stored.startsWith(`${requested.trim()}\n\n────────────────────────`);
}
