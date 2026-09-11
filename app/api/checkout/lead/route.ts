import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { createAdminClient } from "@/lib/supabase/admin";
import { isConfiguredDemoUser } from "@/lib/auth/demo";
import { getStripeClient } from "@/lib/stripe/client";
import {
  createLeadUnlockIntent,
  findLeadUnlock,
  isPaidUnlock,
  LEAD_UNLOCK_AMOUNT_PENCE,
  updateLeadUnlock,
  type LeadUnlockTarget,
} from "@/lib/data/lead-unlocks";
import { getMarketSignalForLeadUnlock } from "@/lib/data/trade-intelligence";

const bodySchema = z
  .object({
    opportunity_id: z.string().uuid().optional(),
    market_signal_id: z.string().uuid().optional(),
  })
  .refine((body) => Boolean(body.opportunity_id) !== Boolean(body.market_signal_id), {
    message: "Provide exactly one opportunity target",
  });

type RpcBridge = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export async function POST(request: Request) {
  const company = await getCurrentCompany();
  if (!company) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const target: LeadUnlockTarget = parsed.data.opportunity_id
    ? { opportunityId: parsed.data.opportunity_id }
    : { marketSignalId: parsed.data.market_signal_id! };

  const rpc = supabase as unknown as RpcBridge;
  const targetExists = "opportunityId" in target
    ? await rpc.rpc("browse_opportunity_teaser", { p_opportunity_id: target.opportunityId })
    : { data: await getMarketSignalForLeadUnlock(target.marketSignalId), error: null };
  if (targetExists.error || !hasRpcRow(targetExists.data)) {
    return NextResponse.json({ error: "opportunity_not_found" }, { status: 404 });
  }

  const existing = await findLeadUnlock(company.id, target);
  if (isPaidUnlock(existing)) {
    return NextResponse.json({ unlocked: true, url: destinationFor(target, request) });
  }
  if (existing?.status === "pending" && existing.stripe_checkout_session_id) {
    return NextResponse.json({ error: "checkout_in_progress" }, { status: 409 });
  }

  const { row, error: intentError } = await createLeadUnlockIntent({
    companyId: company.id,
    userId: user.id,
    target,
  });
  if (intentError || !row) {
    console.error("lead unlock intent failed", intentError);
    return NextResponse.json({ error: "unlock_intent_failed" }, { status: 500 });
  }

  const admin = createAdminClient() as unknown as SupabaseClient;
  const configuredDemo = isConfiguredDemoUser(user);
  let databaseDemo = false;
  if (!configuredDemo) {
    const { data: demoAccount, error } = await admin
      .from("demo_accounts")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error) databaseDemo = Boolean(demoAccount);
  }

  if (configuredDemo || databaseDemo) {
    await updateLeadUnlock(row.id, {
      status: "paid",
      unlocked_at: new Date().toISOString(),
    });
    return NextResponse.json({ demo: true, unlocked: true, url: destinationFor(target, request) });
  }

  try {
    const [{ data: companyRow }, stripe] = await Promise.all([
      supabase
        .from("companies")
        .select("trading_name, billing_email, stripe_customer_id")
        .eq("id", company.id)
        .single(),
      Promise.resolve(getStripeClient()),
    ]);
    if (!companyRow) throw new Error("company_not_found");

    let stripeCustomerId = companyRow.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: companyRow.billing_email,
        name: companyRow.trading_name,
        metadata: { company_id: company.id },
      });
      stripeCustomerId = customer.id;
      await supabase.from("companies").update({ stripe_customer_id: stripeCustomerId }).eq("id", company.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: LEAD_UNLOCK_AMOUNT_PENCE,
            product_data: {
              name: "Opportunity lead unlock",
              description: "Reveal the complete company, contact and evidence brief for one matched opportunity.",
            },
          },
          quantity: 1,
        },
      ],
      success_url: destinationFor(target, request, appUrl) + "?checkout=success",
      cancel_url: destinationFor(target, request, appUrl) + "?checkout=cancelled",
      metadata: {
        lead_unlock_id: row.id,
        company_id: company.id,
        ...( "opportunityId" in target
          ? { opportunity_id: target.opportunityId }
          : { market_signal_id: target.marketSignalId }),
      },
    });

    await updateLeadUnlock(row.id, { stripe_checkout_session_id: checkout.id });
    return NextResponse.json({ url: checkout.url, checkout_session_id: checkout.id });
  } catch (error) {
    console.error("checkout/lead failed", error);
    await updateLeadUnlock(row.id, { status: "failed" });
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 502 });
  }
}

function hasRpcRow(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value && typeof value === "object");
}

function destinationFor(target: LeadUnlockTarget, request: Request, baseUrl?: string): string {
  const base = baseUrl ?? new URL(request.url).origin;
  return "opportunityId" in target
    ? `${base}/opportunities/${encodeURIComponent(target.opportunityId)}`
    : `${base}/opportunities/trade/${encodeURIComponent(target.marketSignalId)}`;
}
