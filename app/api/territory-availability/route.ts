import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkEdgeRateLimit } from "@/lib/rate-limit";
import { normalisePostcodeDistrict } from "@/lib/postcode";

const querySchema = z.object({ postcode: z.string().trim().min(2).max(8), trade: z.string().trim().min(1) });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ postcode: url.searchParams.get("postcode"), trade: url.searchParams.get("trade") });
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const postcodeDistrict = normalisePostcodeDistrict(parsed.data.postcode);
  if (postcodeDistrict.length < 2 || postcodeDistrict.length > 5) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkEdgeRateLimit(ip))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const [{ data, error }, { data: teaserData, error: teaserError }, { data: feedData, error: feedError }] = await Promise.all([
    supabase.rpc("check_territory_availability", { p_postcode_district: postcodeDistrict, p_trade_slug: parsed.data.trade }),
    supabase.rpc("browse_territory_teaser", { p_postcode_district: postcodeDistrict, p_trade_slug: parsed.data.trade }),
    supabase.rpc("browse_territory_trade_signal_feed", { p_postcode_district: postcodeDistrict, p_trade_slug: parsed.data.trade, p_limit: 100 }),
  ]);

  if (error) {
    const message = error.message ?? "";
    if (message.includes("rate_limited")) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (message.includes("unknown_postcode_district")) return NextResponse.json({ error: "unknown_postcode_district" }, { status: 400 });
    if (message.includes("unknown_trade")) return NextResponse.json({ error: "unknown_trade" }, { status: 400 });
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  const teaser = teaserError ? null : Array.isArray(teaserData) ? teaserData[0] ?? null : teaserData;
  const feed = feedError ? [] : ((feedData ?? []) as Array<Record<string, unknown>>);
  const signalBreakdown = feedError ? null : {
    hot: feed.filter((row) => row.opportunity_bucket === "hot").length,
    warm: feed.filter((row) => row.opportunity_bucket === "strong").length,
    early: feed.filter((row) => row.opportunity_bucket === "possible" || row.opportunity_bucket === "low").length,
  };
  const marketCounts = new Map<string, number>();
  for (const row of feed) {
    const key = typeof row.source_kind === "string" ? row.source_kind : typeof row.signal_type === "string" ? row.signal_type : "other";
    marketCounts.set(key, (marketCounts.get(key) ?? 0) + 1);
  }
  const marketBreakdown = feedError ? null : [...marketCounts.entries()].map(([key, count]) => ({ key, count }));
  return NextResponse.json({ ok: true, ...result, teaser, signal_breakdown: signalBreakdown, market_breakdown: marketBreakdown });
}
