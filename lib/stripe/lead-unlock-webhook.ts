import "server-only";

import type Stripe from "stripe";
import { findLeadUnlockById, updateLeadUnlock } from "@/lib/data/lead-unlocks";

/** Returns true when the event belongs to the one-time lead unlock flow. */
export async function handleLeadUnlockStripeEvent(event: Stripe.Event): Promise<boolean> {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.expired") return false;

  const session = event.data.object as Stripe.Checkout.Session;
  const unlockId = session.metadata?.lead_unlock_id;
  if (!unlockId) return false;

  const unlock = await findLeadUnlockById(unlockId);
  if (!unlock) {
    throw new Error(`lead_unlock_not_found:${unlockId}`);
  }

  if (event.type === "checkout.session.expired") {
    await updateLeadUnlock(unlock.id, { status: "expired" });
    return true;
  }

  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return true;

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  await updateLeadUnlock(unlock.id, {
    status: "paid",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntent,
    unlocked_at: new Date().toISOString(),
  });
  return true;
}
