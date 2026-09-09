import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkEdgeRateLimit } from "@/lib/rate-limit";
import { normalisePostcodeDistrict } from "@/lib/postcode";

const querySchema = z.object({
  postcode: z.string().trim().min(2).max(8),
  trade: z.string().trim().min(1),
});

/**
 * Public, unauthenticated. Two rate-limit layers, per plan section 12:
 * Cloudflare's edge binding here (fast, cheap, but only present on
 * Cloudflare) is the first line of defense; check_territory_availability()
 * enforces its own DB-level limit regardless (it's GRANTed directly to
 * anon and reachable via PostgREST independent of this route, so that
 * layer alone is what actually protects a direct RPC call, and what
 * protects local dev / any environment without the edge binding).
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

  const postcodeDistrict = normalisePostcodeDistrict(parsed.data.postcode);
  if (postcodeDistrict.length < 2 || postcodeDistrict.length > 5) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const edgeAllowed = await checkEdgeRateLimit(ip);
  if (!edgeAllowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const supabase = await createClient();
  const [{ data, error }, { data: teaserData, error: teaserError }] = await Promise.all([
    supabase.rpc("check_territory_availability", {
      p_postcode_district: postcodeDistrict,
      p_trade_slug: parsed.data.trade,
    }),
    supabase.rpc("browse_territory_teaser", {
      p_postcode_district: postcodeDistrict,
      p_trade_slug: parsed.data.trade,
    }),
  ]);

  if (error) {
    const message = error.message ?? "";
    if (message.includes("rate_limited")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (message.includes("unknown_postcode_district")) {
      return NextResponse.json({ error: "unknown_postcode_district" }, { status: 400 });
    }
    if (message.includes("unknown_trade")) {
      return NextResponse.json({ error: "unknown_trade" }, { status: 400 });
    }
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  const teaser = teaserError ? null : Array.isArray(teaserData) ? teaserData[0] ?? null : teaserData;
  return NextResponse.json({ ok: true, ...result, teaser });
}
