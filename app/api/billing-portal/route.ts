import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { getStripeClient } from "@/lib/stripe/client";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const company = await getCurrentCompany();
  if (!company) {
    return NextResponse.json({ error: "no_company" }, { status: 403 });
  }

  const { data: companyRow } = await supabase
    .from("companies")
    .select("stripe_customer_id")
    .eq("id", company.id)
    .single();

  if (!companyRow?.stripe_customer_id) {
    return NextResponse.json({ error: "no_billing_account" }, { status: 400 });
  }

  const stripe = getStripeClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: companyRow.stripe_customer_id,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
