import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isConfiguredDemoUser } from "@/lib/auth/demo";

const bodySchema = z.object({
  postcode_districts: z.array(z.string().trim().min(2).max(8)).min(1).max(500),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!isConfiguredDemoUser(user)) {
    return NextResponse.json({ error: "billing_update_required" }, { status: 409 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const districts = [...new Set(parsed.data.postcode_districts.map((district) => district.trim().toUpperCase()))];
  const db = supabase as any;
  const { data, error } = await db.rpc("change_coverage_plan", {
    p_coverage_plan_id: id,
    p_postcode_districts: districts,
  });

  if (error || !data?.[0]) {
    const message = error?.message ?? "";
    if (message.includes("coverage_plan_not_found")) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (message.includes("territory_unavailable")) {
      return NextResponse.json({ error: "territory_unavailable" }, { status: 409 });
    }
    if (message.includes("paid_coverage_change_requires_billing") || message.includes("county_coverage_change_requires_billing")) {
      return NextResponse.json({ error: "billing_update_required" }, { status: 409 });
    }
    if (message.includes("unknown_postcode_district") || message.includes("no_postcode_districts") || message.includes("too_many_postcode_districts")) {
      return NextResponse.json({ error: "unknown_territory" }, { status: 400 });
    }
    return NextResponse.json({ error: "coverage_change_failed" }, { status: 400 });
  }

  return NextResponse.json({
    plan: data[0].coverage_plan_id,
    monthly_price_pence: data[0].monthly_price_pence,
    postcode_count: data[0].postcode_count,
  });
}
