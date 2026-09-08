import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isConfiguredDemoUser } from "@/lib/auth/demo";
import { getStripeClient } from "@/lib/stripe/client";

const bodySchema = z
  .object({
    postcode_district: z.string().trim().min(2).max(8).optional(),
    postcode_districts: z.array(z.string().trim().min(2).max(8)).min(1).max(500).optional(),
    trade_category_id: z.string().trim().uuid(),
    billing_mode: z.enum(["custom", "county"]).default("custom"),
    coverage_area_id: z.string().trim().uuid().nullable().optional(),
  })
  .refine((body) => Boolean(body.postcode_districts?.length || body.postcode_district), {
    message: "postcode_districts is required",
  });

/**
 * Receives postcode districts and a trade only. Prices are calculated inside
 * reserve_coverage_plan() from the server-side pricing function; the client
 * never supplies a price or company id.
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

  const districts = [...new Set(
    (parsed.data.postcode_districts ?? [parsed.data.postcode_district!])
      .map((district) => district.trim().toUpperCase())
      .filter(Boolean),
  )];

  const db = supabase as any;
  const admin = createAdminClient();
  const adminDb = admin as any;

  const { data: reservationRows, error: reserveError } = await db.rpc("reserve_coverage_plan", {
    p_postcode_districts: districts,
    p_trade_category_id: parsed.data.trade_category_id,
    p_billing_mode: parsed.data.billing_mode,
    p_coverage_area_id: parsed.data.coverage_area_id ?? null,
  });

  if (reserveError || !reservationRows?.[0]) {
    const message = reserveError?.message ?? "";
    if (reserveError?.code === "23505" || message.includes("territory_unavailable")) {
      return NextResponse.json({ error: "territory_unavailable" }, { status: 409 });
    }
    if (message.includes("coverage_plan_exists")) {
      return NextResponse.json({ error: "coverage_plan_exists" }, { status: 409 });
    }
    if (
      message.includes("unknown_postcode_district") ||
      message.includes("unknown_trade") ||
      message.includes("no_postcode_districts") ||
      message.includes("too_many_postcode_districts")
    ) {
      return NextResponse.json({ error: "unknown_territory" }, { status: 400 });
    }
    if (
      message.includes("coverage_area_required") ||
      message.includes("coverage_area_unavailable") ||
      message.includes("county_requires_complete_selection") ||
      message.includes("coverage_area_not_allowed")
    ) {
      return NextResponse.json({ error: "invalid_coverage_area" }, { status: 400 });
    }
    if (message.includes("no_authorized_company")) {
      return NextResponse.json({ error: "no_authorized_company" }, { status: 403 });
    }
    return NextResponse.json({ error: "reservation_failed" }, { status: 400 });
  }

  const reservation = reservationRows[0] as {
    coverage_plan_id: string;
    first_territory_claim_id: string;
    monthly_price_pence: number;
    postcode_count: number;
  };

  const { data: plan } = await adminDb
    .from("coverage_plans")
    .select("id, company_id")
    .eq("id", reservation.coverage_plan_id)
    .maybeSingle();

  const [{ data: company }, { data: trade }, { data: planItems }] = await Promise.all([
    supabase.from("companies").select("id, trading_name, billing_email, stripe_customer_id").eq("id", plan?.company_id).single(),
    supabase.from("trade_categories").select("name, slug").eq("id", parsed.data.trade_category_id).single(),
    adminDb
      .from("coverage_plan_items")
      .select("territory_claim_id, postcode_district")
      .eq("coverage_plan_id", reservation.coverage_plan_id)
      .order("postcode_district"),
  ]);

  const claimIds = (planItems ?? []).map((item: { territory_claim_id: string }) => item.territory_claim_id);
  const firstDistrict = (planItems?.[0]?.postcode_district as string | undefined) ?? districts[0];

  if (!plan || !company || !trade || claimIds.length === 0) {
    throw new Error("Could not load coverage plan for checkout");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (isConfiguredDemoUser(user)) {
    const now = new Date().toISOString();
    const { error: activationError } = await adminDb
      .from("territory_claims")
      .update({
        status: "active",
        activated_at: now,
        reserved_expires_at: null,
        stripe_checkout_session_id: null,
        stripe_subscription_id: null,
      })
      .in("id", claimIds)
      .eq("company_id", company.id)
      .eq("status", "reserved");

    if (activationError) {
      throw new Error("demo_activation_failed");
    }

    const { error: planActivationError } = await adminDb
      .from("coverage_plans")
      .update({ status: "active", current_period_start: now })
      .eq("id", reservation.coverage_plan_id)
      .eq("company_id", company.id)
      .eq("status", "reserved");

    if (planActivationError) {
      throw new Error("demo_activation_failed");
    }

    return NextResponse.json({
      demo: true,
      plan: reservation.coverage_plan_id,
      claim: reservation.first_territory_claim_id,
      url:
        appUrl +
        "/territories/claim/confirming?plan=" +
        encodeURIComponent(reservation.coverage_plan_id) +
        "&claim=" +
        encodeURIComponent(reservation.first_territory_claim_id) +
        "&demo=1",
    });
  }

  try {
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
      coverage_plan_id: reservation.coverage_plan_id,
      territory_claim_id: reservation.first_territory_claim_id,
      company_id: company.id,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: reservation.monthly_price_pence,
            recurring: { interval: "month" },
            product_data: {
              name: String(reservation.postcode_count) + " postcode " + trade.name + " coverage",
              description:
                "Exclusive MyTradeBox coverage across " +
                String(reservation.postcode_count) +
                " postcode district" +
                (reservation.postcode_count === 1 ? "" : "s"),
            },
          },
          quantity: 1,
        },
      ],
      success_url:
        appUrl +
        "/territories/claim/confirming?plan=" +
        encodeURIComponent(reservation.coverage_plan_id) +
        "&claim=" +
        encodeURIComponent(reservation.first_territory_claim_id),
      cancel_url: appUrl + "/territories/" + firstDistrict + "/" + trade.slug,
      metadata,
      subscription_data: { metadata },
    });

    await adminDb
      .from("territory_claims")
      .update({ stripe_checkout_session_id: session.id })
      .in("id", claimIds)
      .eq("company_id", company.id)
      .eq("status", "reserved");

    return NextResponse.json({
      url: session.url,
      plan: reservation.coverage_plan_id,
      claim: reservation.first_territory_claim_id,
    });
  } catch (err) {
    console.error("checkout/territory failed after coverage reservation", err);
    await adminDb
      .from("territory_claims")
      .update({ status: "expired" })
      .in("id", claimIds)
      .eq("status", "reserved");
    await adminDb
      .from("coverage_plans")
      .update({ status: "expired" })
      .eq("id", reservation.coverage_plan_id)
      .eq("status", "reserved");

    const error = err instanceof Error && err.message === "demo_activation_failed" ? "demo_activation_failed" : "checkout_failed";
    return NextResponse.json({ error }, { status: error === "demo_activation_failed" ? 500 : 502 });
  }
}
