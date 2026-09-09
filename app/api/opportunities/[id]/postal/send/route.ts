import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getPostalOpportunityContext } from "@/lib/outreach/postal-context";
import { getPostalOutreachProvider } from "@/lib/outreach/postal-provider";

const bodySchema = z.object({ content: z.string().trim().min(20).max(12000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const company = await requireCurrentCompany();
  const { id } = await params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const provider = getPostalOutreachProvider();
  if (!provider) return NextResponse.json({ error: "postal_provider_not_configured" }, { status: 503 });

  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
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

    const { data: delivery, error: insertError } = await db
      .from("outreach_deliveries")
      .insert({
        company_id: company.id,
        opportunity_id: id,
        lead_match_id: leadMatch?.id ?? null,
        channel: "letter",
        provider: provider.name,
        status: "draft",
        recipient_name: recipient.name ?? context.strategy.suggestedRecipient,
        recipient_address: recipient,
        content_snapshot: body.data.content,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insertError || !delivery) return NextResponse.json({ error: "delivery_create_failed" }, { status: 500 });

    const result = await provider.sendLetter({
      deliveryId: delivery.id,
      recipient,
      content: body.data.content,
      reference: `opportunity-${id}`,
    });
    const now = new Date().toISOString();

    await db
      .from("outreach_deliveries")
      .update({
        provider_job_id: result.providerJobId,
        status: result.status,
        cost_pence: result.costPence ?? null,
        tracking_url: result.trackingUrl ?? null,
        sent_at: result.status === "sent" ? now : null,
        updated_at: now,
      })
      .eq("id", delivery.id)
      .eq("company_id", company.id);

    await db.from("opportunity_activity_events").insert({
      company_id: company.id,
      opportunity_id: id,
      lead_match_id: leadMatch?.id ?? null,
      event_type: result.status === "sent" ? "letter_sent" : "letter_queued",
      channel: "letter",
      provider: provider.name,
      provider_reference: result.providerJobId,
      metadata: { delivery_id: delivery.id, cost_pence: result.costPence ?? null },
      created_by: user.id,
    });

    return NextResponse.json({
      deliveryId: delivery.id,
      provider: provider.name,
      status: result.status,
      costPence: result.costPence ?? null,
      trackingUrl: result.trackingUrl ?? null,
    });
  } catch (error) {
    console.error("Postal send failed", error);
    return NextResponse.json({ error: "postal_send_failed" }, { status: 502 });
  }
}
