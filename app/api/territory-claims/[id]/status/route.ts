import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Polled by the post-checkout "confirming your payment" page. Only the
 * webhook ever changes territory_claims.status — this just reads it back.
 * RLS (is_company_member) already scopes this to the caller's own company,
 * so a claim id belonging to someone else simply returns not_found.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: claim } = await supabase.from("territory_claims").select("status").eq("id", id).maybeSingle();

  if (!claim) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ status: claim.status });
}
