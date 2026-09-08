import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Polled by the post-checkout confirmation page. The webhook (or the
 * server-side demo path) changes plan/claim state; this route only reads it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const planId = url.searchParams.get("plan");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (planId) {
    const db = supabase as any;
    const { data: plan } = await db.from("coverage_plans").select("status").eq("id", planId).maybeSingle();
    if (!plan) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ status: plan.status });
  }

  const { data: claim } = await supabase.from("territory_claims").select("status").eq("id", id).maybeSingle();
  if (!claim) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ status: claim.status });
}
