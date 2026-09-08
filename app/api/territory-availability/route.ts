import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  postcode: z.string().trim().min(2).max(5),
  trade: z.string().trim().min(1),
});

/**
 * Public, unauthenticated. Thin wrapper over check_territory_availability(),
 * which is where the real rate limiting lives (it's GRANTed directly to
 * anon and reachable via PostgREST regardless of this route, so limiting
 * only here would protect nothing against a direct RPC call).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    postcode: url.searchParams.get("postcode"),
    trade: url.searchParams.get("trade"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_territory_availability", {
    p_postcode_district: parsed.data.postcode,
    p_trade_slug: parsed.data.trade,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("rate_limited")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (message.includes("unknown_trade")) {
      return NextResponse.json({ error: "unknown_trade" }, { status: 400 });
    }
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, ...result });
}
