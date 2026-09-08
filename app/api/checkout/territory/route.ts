import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isConfiguredDemoUser } from "@/lib/auth/demo";
import { getStripeClient } from "@/lib/stripe/client";

const bodySchema = z.object({
  postcode_district: z.string().trim().min(2).max(5),
  trade_category_id: z.string().trim().uuid(),
});

/**
 * Receives ONLY { postcode_district, trade_category_id } from the client —
 * never a price or company id. reserve_territory() resolves the caller's
 * company and enforces exclusivity server-side; the price paid is always
 * read live from the territories row, never trusted from the request.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { postcode_district, trade_category_id } = parsed.data;

  const { data: claim, error: reserveError } = await supabase.rpc("reserve_territory", {
    p_postcode_district: postcode_district,
    p_trade_category_id: trade_category_id,
  });

  if (reserveError || !claim) {
    const message = reserveError?.message ?? "";
    if (reserveError?.code === "23505" || message.includes("territory_unavailable")) {
      return NextResponse.json({ error: "territory_unavailable" }, { status: 409 });
    }
    if (message.includes("no_authorized_company")) {
      return NextResponse.json({ error: "no_authorized_company" }, { status: 403 });
    }
    if (message.includes("unknown_postcode_district") || message.includes("unknown_trade")) {
      return NextResponse.json({ error: "unknown_territory" }, { status: 400 });
    }
    return NextResponse.json({ error: "reservation_failed" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const [{ data: company }, { data: territory }, { data: trade }] = await Promise.all([
      supabase
        .from("companies")
        .select("id, trading_name, billing_email, stripe_customer_id")
        .eq("id", claim.company_id)
        .single(),
      supabase.from("territories").select("monthly_price_pence, postcode_district").eq("id", claim.territory_id).single(),
      supabase.from("trade_categories").select("name, slug").eq("id", trade_category_id).single(),
    ]);

    if (!company || !territory || !trade) {
      throw new Error("Could not load company/territory/trade for checkout");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Demo access is explicit and server-side. It still reserves through the
    // normal RPC, then activates the real claim so DB matching triggers,
    // dashboard access and RLS behave exactly like a paid territory.
    if (isConfiguredDemoUser(user)) {
      const { data: activatedClaim, error: activationError } = await admin
        .from("territory_claims")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
          reserved_expires_at: null,
          stripe_checkout_session_id: null,
          stripe_subscription_id: null,
        })
        .eq("id", claim.id)
        .eq("company_id", claim.company_id)
        .eq("status", "reserved")
        .select("id")
        .maybeSingle();

      if (activationError || !activatedClaim) {
        throw new Error("demo_activation_failed");
      }

      return NextResponse.json({
        demo: true,
        url: `${appUrl}/territories/claim/confirming?claim=${claim.id}&demo=1`,
      });
    }

    const stripe = getStripeClient();

    let stripeCustomerId = company.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: company.billing_email,
        name: company.trading_name,
        metadata: { company_id: company.id },
      });
      stripeCustomerId = customer.id;
      await supabase.from("companies").update({ stripe_customer_id: stripeCustomerId }).eq("id", company.id);
    }

    const metadata = {
      territory_claim_id: claim.id,
      territory_id: claim.territory_id,
      company_id: company.id,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: territory.monthly_price_pence,
            recurring: { interval: "month" },
            product_data: {
              name: `${territory.postcode_district} ${trade.name} territory`,
              description: "Exclusive MyTradeBox local territory subscription",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/territories/claim/confirming?claim=${claim.id}`,
      cancel_url: `${appUrl}/territories/${territory.postcode_district}/${trade.slug}`,
      metadata,
      // Session-level metadata does not propagate to the Subscription object —
      // only subscription_data.metadata does, and subscription-lifecycle
      // webhooks carry the Subscription, not the Session.
      subscription_data: { metadata },
    });

    await admin.from("territory_claims").update({ stripe_checkout_session_id: session.id }).eq("id", claim.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout/territory failed after reservation", err);
    await admin
      .from("territory_claims")
      .update({ status: "expired" })
      .eq("id", claim.id)
      .eq("status", "reserved");

    const error = err instanceof Error && err.message === "demo_activation_failed" ? "demo_activation_failed" : "checkout_failed";
    return NextResponse.json({ error }, { status: error === "demo_activation_failed" ? 500 : 502 });
  }
}
