import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleStripeEvent } from "@/lib/stripe/webhook-handlers";
import { handleLeadUnlockStripeEvent } from "@/lib/stripe/lead-unlock-webhook";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    console.error("Stripe webhook received without a signature header or STRIPE_WEBHOOK_SECRET configured");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: inserted, error: insertError } = await admin
    .from("stripe_events")
    .upsert({ id: event.id, type: event.type, payload: JSON.parse(JSON.stringify(event)) }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (insertError) return NextResponse.json({ error: "event_log_failed" }, { status: 500 });
  if (!inserted || inserted.length === 0) return NextResponse.json({ received: true });

  try {
    await handleStripeEvent(admin, event);
    await handleLeadUnlockStripeEvent(event);
  } catch (error) {
    console.error(`Failed handling Stripe event ${event.type} (${event.id})`, error);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
