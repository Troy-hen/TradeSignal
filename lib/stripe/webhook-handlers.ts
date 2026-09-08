import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type AdminClient = SupabaseClient<Database>;

export async function handleStripeEvent(admin: AdminClient, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(admin, event.data.object);
    case "checkout.session.expired":
      return handleCheckoutExpired(admin, event.data.object);
    case "customer.subscription.updated":
      return handleSubscriptionUpdated(admin, event.data.object);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(admin, event.data.object);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(admin, event.data.object);
    case "invoice.payment_succeeded":
      return handleInvoicePaymentSucceeded(admin, event.data.object);
    default:
      // Acknowledged, not an error — we don't act on every Stripe event type.
      return;
  }
}

function resolveRefId(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

async function handleCheckoutCompleted(admin: AdminClient, session: Stripe.Checkout.Session) {
  const territoryClaimId = session.metadata?.territory_claim_id;
  if (!territoryClaimId) return;

  const subscriptionId = resolveRefId(session.subscription);
  const customerId = resolveRefId(session.customer);

  // The `.eq("status", "reserved")` guard makes duplicate/late delivery a
  // harmless no-op — the row that matters here has already moved on.
  const { data: claim } = await admin
    .from("territory_claims")
    .update({
      status: "active",
      activated_at: new Date().toISOString(),
      stripe_subscription_id: subscriptionId,
    })
    .eq("id", territoryClaimId)
    .eq("status", "reserved")
    .select("id, company_id, territory_id")
    .maybeSingle();

  if (!claim || !subscriptionId || !customerId) return;

  await admin.from("subscriptions").upsert(
    {
      company_id: claim.company_id,
      territory_claim_id: claim.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: "active",
    },
    { onConflict: "stripe_subscription_id" },
  );

  await admin.from("audit_logs").insert({
    actor_type: "webhook",
    action: "territory.activated",
    entity_type: "territory_claim",
    entity_id: claim.id,
    after_state: { status: "active", stripe_subscription_id: subscriptionId },
  });
}

async function handleCheckoutExpired(admin: AdminClient, session: Stripe.Checkout.Session) {
  const territoryClaimId = session.metadata?.territory_claim_id;
  if (!territoryClaimId) return;

  await admin.from("territory_claims").update({ status: "expired" }).eq("id", territoryClaimId).eq("status", "reserved");
}

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): Database["public"]["Enums"]["subscription_status"] {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    default:
      // "paused" and any future Stripe status with no direct MVP equivalent.
      return "incomplete";
  }
}

async function handleSubscriptionUpdated(admin: AdminClient, subscription: Stripe.Subscription) {
  const territoryClaimId = subscription.metadata?.territory_claim_id;
  const companyId = subscription.metadata?.company_id;
  const customerId = resolveRefId(subscription.customer);
  // current_period_start/end live on subscription items, not the
  // subscription itself, since Stripe's 2025-03-31 (Basil) API changes.
  const item = subscription.items.data[0];
  const status = mapSubscriptionStatus(subscription.status);

  if (territoryClaimId && companyId && customerId) {
    await admin.from("subscriptions").upsert(
      {
        company_id: companyId,
        territory_claim_id: territoryClaimId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: item?.price.id ?? null,
        status,
        current_period_start: item ? new Date(item.current_period_start * 1000).toISOString() : null,
        current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      },
      { onConflict: "stripe_subscription_id" },
    );
  }

  if (status === "past_due" || status === "unpaid") {
    const { data: claim } = await admin
      .from("territory_claims")
      .update({ status: "suspended", suspended_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscription.id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (claim) {
      await admin.from("audit_logs").insert({
        actor_type: "webhook",
        action: "subscription.suspended",
        entity_type: "territory_claim",
        entity_id: claim.id,
        after_state: { status: "suspended", stripe_status: subscription.status },
      });
    }
  } else if (status === "active") {
    const { data: claim } = await admin
      .from("territory_claims")
      .update({ status: "active" })
      .eq("stripe_subscription_id", subscription.id)
      .eq("status", "suspended")
      .select("id")
      .maybeSingle();

    if (claim) {
      await admin.from("audit_logs").insert({
        actor_type: "webhook",
        action: "subscription.reactivated",
        entity_type: "territory_claim",
        entity_id: claim.id,
        after_state: { status: "active", stripe_status: subscription.status },
      });
    }
  }
}

async function handleSubscriptionDeleted(admin: AdminClient, subscription: Stripe.Subscription) {
  await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id);

  // Frees the territory_claims exclusivity slot (uq_territory_claims_locking
  // only blocks reserved/active/suspended) — the single most important
  // state transition on this table to have an audit trail for.
  const { data: claim } = await admin
    .from("territory_claims")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .in("status", ["active", "suspended"])
    .select("id, territory_id, company_id")
    .maybeSingle();

  if (claim) {
    await admin.from("audit_logs").insert({
      actor_type: "webhook",
      action: "territory.cancelled",
      entity_type: "territory_claim",
      entity_id: claim.id,
      after_state: { status: "cancelled", territory_id: claim.territory_id, company_id: claim.company_id },
    });
  }
}

function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  return details ? resolveRefId(details.subscription) : null;
}

async function handleInvoicePaymentFailed(admin: AdminClient, invoice: Stripe.Invoice) {
  const subscriptionId = resolveInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await admin.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subscriptionId);

  const { data: claim } = await admin
    .from("territory_claims")
    .update({ status: "suspended", suspended_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "active")
    .select("id, company_id")
    .maybeSingle();

  // Actual sending happens in the notify-leads cron — this just queues the
  // row (processQueuedNotifications drains notification_log) so the
  // handler can return fast.
  if (claim) {
    await admin.from("notification_log").insert({
      company_id: claim.company_id,
      notification_type: "payment_failed",
      status: "queued",
      subject: "Action needed: your TradeSignal payment failed",
    });

    await admin.from("audit_logs").insert({
      actor_type: "webhook",
      action: "subscription.suspended",
      entity_type: "territory_claim",
      entity_id: claim.id,
      after_state: { status: "suspended", reason: "invoice.payment_failed" },
    });
  }
}

async function handleInvoicePaymentSucceeded(admin: AdminClient, invoice: Stripe.Invoice) {
  const subscriptionId = resolveInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await admin.from("subscriptions").update({ status: "active" }).eq("stripe_subscription_id", subscriptionId);

  const { data: claim } = await admin
    .from("territory_claims")
    .update({ status: "active" })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "suspended")
    .select("id")
    .maybeSingle();

  if (claim) {
    await admin.from("audit_logs").insert({
      actor_type: "webhook",
      action: "subscription.reactivated",
      entity_type: "territory_claim",
      entity_id: claim.id,
      after_state: { status: "active", reason: "invoice.payment_succeeded" },
    });
  }
}
