import "server-only";
import Stripe from "stripe";

/**
 * Lazily constructed so importing this module never throws when the key is
 * unset (local dev before Stripe is configured) — only calling a Stripe
 * operation does.
 */
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey);
}
