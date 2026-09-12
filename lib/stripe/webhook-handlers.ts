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
      return;
  }
}

function resolveRefId(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

function resolveTerritoryClaimIds(
  items: Array<{ territory_claim_id: string | null }> | null,
): string[] {
  return (items ?? []).flatMap((item) =>
    item.territory_claim_id ? [item.territory_claim_id] : [],
  );
}

async function handleCheckoutCompleted(admin: AdminClient, session: Stripe.Checkout.Session) {
  const coveragePlanId = session.metadata?.coverage_plan_id;
  if (coveragePlanId) {
    return handleCoverageCheckoutCompleted(admin, session, coveragePlanId);
  }

  const territoryClaimId = session.metadata?.territory_claim_id;
  if (!territoryClaimId) return;

  const subscriptionId = resolveRefId(session.subscription);
  const customerId = resolveRefId(session.customer);

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

async function handleCoverageCheckoutCompleted(
  admin: AdminClient,
  session: Stripe.Checkout.Session,
  coveragePlanId: string,
) {
  const db = admin;
  const subscriptionId = resolveRefId(session.subscription);
  const customerId = resolveRefId(session.customer);
  if (!subscriptionId || !customerId) return;

  const { data: plan } = await db
    .from("coverage_plans")
    .select("id, company_id")
    .eq("id", coveragePlanId)
    .maybeSingle();

  const { data: items } = await db
    .from("coverage_plan_items")
    .select("territory_claim_id")
    .eq("coverage_plan_id", coveragePlanId)
    .eq("status", "active");

  const claimIds = resolveTerritoryClaimIds(items);
  const firstClaimId = claimIds[0];
  if (!plan || !firstClaimId || claimIds.length === 0) return;

  const now = new Date().toISOString();
  await db
    .from("coverage_plans")
    .update({
      status: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_start: now,
    })
    .eq("id", coveragePlanId)
    .eq("status", "reserved");

  await db
    .from("territory_claims")
    .update({
      status: "active",
      activated_at: now,
      reserved_expires_at: null,
      stripe_subscription_id: subscriptionId,
    })
    .in("id", claimIds)
    .eq("status", "reserved");

  await db.from("subscriptions").upsert(
    {
      company_id: plan.company_id,
      coverage_plan_id: coveragePlanId,
      territory_claim_id: firstClaimId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: "active",
    },
    { onConflict: "stripe_subscription_id" },
  );

  await db.from("audit_logs").insert({
    actor_type: "webhook",
    action: "coverage_plan.activated",
    entity_type: "coverage_plan",
    entity_id: coveragePlanId,
    after_state: {
      status: "active",
      stripe_subscription_id: subscriptionId,
      postcode_count: claimIds.length,
    },
  });
}

async function handleCheckoutExpired(admin: AdminClient, session: Stripe.Checkout.Session) {
  const db = admin;
  const coveragePlanId = session.metadata?.coverage_plan_id;
  if (coveragePlanId) {
    const { data: items } = await db
      .from("coverage_plan_items")
      .select("territory_claim_id")
      .eq("coverage_plan_id", coveragePlanId);

    const claimIds = resolveTerritoryClaimIds(items);
    await db.from("territory_claims").update({ status: "expired" }).in("id", claimIds).eq("status", "reserved");
    await db.from("coverage_plans").update({ status: "expired" }).eq("id", coveragePlanId).eq("status", "reserved");
    return;
  }

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
      return "incomplete";
  }
}

async function handleSubscriptionUpdated(admin: AdminClient, subscription: Stripe.Subscription) {
  const coveragePlanId = subscription.metadata?.coverage_plan_id;
  if (coveragePlanId) {
    return handleCoverageSubscriptionUpdated(admin, subscription, coveragePlanId);
  }

  const territoryClaimId = subscription.metadata?.territory_claim_id;
  const companyId = subscription.metadata?.company_id;
  const customerId = resolveRefId(subscription.customer);
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

async function handleCoverageSubscriptionUpdated(
  admin: AdminClient,
  subscription: Stripe.Subscription,
  coveragePlanId: string,
) {
  const db = admin;
  const customerId = resolveRefId(subscription.customer);
  const item = subscription.items.data[0];
  const status = mapSubscriptionStatus(subscription.status);
  const { data: plan } = await db
    .from("coverage_plans")
    .select("id, company_id")
    .eq("id", coveragePlanId)
    .maybeSingle();

  if (!plan || !customerId) return;

  const { data: items } = await db
    .from("coverage_plan_items")
    .select("territory_claim_id")
    .eq("coverage_plan_id", coveragePlanId)
    .in("status", ["active", "pending_add"]);

  const claimIds = resolveTerritoryClaimIds(items);
  const now = new Date().toISOString();

  await db.from("subscriptions").upsert(
    {
      company_id: plan.company_id,
      coverage_plan_id: coveragePlanId,
      territory_claim_id: claimIds[0] ?? null,
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

  if (status === "past_due" || status === "unpaid") {
    await db.from("coverage_plans").update({ status: "suspended" }).eq("id", coveragePlanId);
    await db.from("territory_claims").update({ status: "suspended", suspended_at: now }).in("id", claimIds).eq("status", "active");
  } else if (status === "active" || status === "trialing") {
    await db.from("coverage_plans").update({ status: "active" }).eq("id", coveragePlanId);
    await db.from("territory_claims").update({ status: "active" }).in("id", claimIds).eq("status", "suspended");
  }
}

async function handleSubscriptionDeleted(admin: AdminClient, subscription: Stripe.Subscription) {
  const db = admin;
  const { data: coverageSubscription } = await db
    .from("subscriptions")
    .select("coverage_plan_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const coveragePlanId = subscription.metadata?.coverage_plan_id ?? coverageSubscription?.coverage_plan_id;
  if (coveragePlanId) {
    const { data: items } = await db
      .from("coverage_plan_items")
      .select("territory_claim_id")
      .eq("coverage_plan_id", coveragePlanId)
      .in("status", ["active", "pending_add", "pending_remove"]);

    const claimIds = resolveTerritoryClaimIds(items);
    await db.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
    await db.from("coverage_plans").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", coveragePlanId);
    await db.from("territory_claims").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).in("id", claimIds).in("status", ["active", "suspended"]);
    await db.from("audit_logs").insert({
      actor_type: "webhook",
      action: "coverage_plan.cancelled",
      entity_type: "coverage_plan",
      entity_id: coveragePlanId,
      after_state: { status: "cancelled", stripe_subscription_id: subscription.id },
    });
    return;
  }

  await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id);

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

  const db = admin;
  const { data: coverageSubscription } = await db
    .from("subscriptions")
    .select("coverage_plan_id, company_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (coverageSubscription?.coverage_plan_id) {
    const { data: items } = await db
      .from("coverage_plan_items")
      .select("territory_claim_id")
      .eq("coverage_plan_id", coverageSubscription.coverage_plan_id)
      .in("status", ["active", "pending_add"]);
    const claimIds = resolveTerritoryClaimIds(items);

    await db.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subscriptionId);
    await db.from("coverage_plans").update({ status: "suspended" }).eq("id", coverageSubscription.coverage_plan_id);
    await db.from("territory_claims").update({ status: "suspended", suspended_at: new Date().toISOString() }).in("id", claimIds).eq("status", "active");
    await db.from("notification_log").insert({
      company_id: coverageSubscription.company_id,
      notification_type: "payment_failed",
      status: "queued",
      subject: "Action needed: your TradeSignal payment failed",
    });
    return;
  }

  await admin.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subscriptionId);

  const { data: claim } = await admin
    .from("territory_claims")
    .update({ status: "suspended", suspended_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "active")
    .select("id, company_id")
    .maybeSingle();

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

  const db = admin;
  const { data: coverageSubscription } = await db
    .from("subscriptions")
    .select("coverage_plan_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (coverageSubscription?.coverage_plan_id) {
    const { data: items } = await db
      .from("coverage_plan_items")
      .select("territory_claim_id")
      .eq("coverage_plan_id", coverageSubscription.coverage_plan_id)
      .in("status", ["active", "pending_add"]);
    const claimIds = resolveTerritoryClaimIds(items);

    await db.from("subscriptions").update({ status: "active" }).eq("stripe_subscription_id", subscriptionId);
    await db.from("coverage_plans").update({ status: "active" }).eq("id", coverageSubscription.coverage_plan_id);
    await db.from("territory_claims").update({ status: "active" }).in("id", claimIds).eq("status", "suspended");
    return;
  }

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
