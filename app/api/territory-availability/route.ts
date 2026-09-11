import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkEdgeRateLimit } from "@/lib/rate-limit";
import { normalisePostcodeDistrict } from "@/lib/postcode";
import { normaliseSellingProfile, type ProfileCandidate } from "@/lib/profile/normalise";

const querySchema = z
  .object({
    postcode: z.string().trim().min(2).max(8),
    profile: z.string().trim().min(1).max(500).optional(),
    trade: z.string().trim().min(1).max(120).optional(),
  })
  .refine((query) => Boolean(query.profile || query.trade), { message: "profile is required" });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    postcode: url.searchParams.get("postcode"),
    profile: url.searchParams.get("profile") ?? undefined,
    trade: url.searchParams.get("trade") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const postcodeDistrict = normalisePostcodeDistrict(parsed.data.postcode);
  if (postcodeDistrict.length < 2 || postcodeDistrict.length > 5) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkEdgeRateLimit(ip))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabase = await createClient();
  const candidatesQuery = await supabase
    .from("trade_categories")
    .select("slug, name, description")
    .eq("is_active", true)
    .order("display_order")
    .limit(120);
  const candidates = (candidatesQuery.data ?? []) as ProfileCandidate[];
  const normalisedProfile = parsed.data.profile
    ? await normaliseSellingProfile(parsed.data.profile, candidates)
    : {
        label: candidates.find((candidate) => candidate.slug === parsed.data.trade)?.name ?? parsed.data.trade ?? "Supplier profile",
        keywords: [],
        buyerTypes: [],
        candidateTradeSlug: parsed.data.trade ?? null,
        confidence: 1,
        source: "fallback" as const,
      };
  const tradeSlug = normalisedProfile.candidateTradeSlug ?? parsed.data.trade;
  if (!tradeSlug) return NextResponse.json({ error: "profile_not_recognised" }, { status: 400 });

  const signalFeedDb = supabase as unknown as { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }> };
  const [{ data, error }, { data: teaserData, error: teaserError }, { data: feedData, error: feedError }] = await Promise.all([
    supabase.rpc("check_territory_availability", { p_postcode_district: postcodeDistrict, p_trade_slug: tradeSlug }),
    supabase.rpc("browse_territory_teaser", { p_postcode_district: postcodeDistrict, p_trade_slug: tradeSlug }),
    signalFeedDb.rpc("browse_territory_trade_signal_feed", { p_postcode_district: postcodeDistrict, p_trade_slug: tradeSlug, p_limit: 100 }),
  ]);

  if (error) {
    const message = error.message ?? "";
    if (message.includes("rate_limited")) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (message.includes("unknown_postcode_district")) return NextResponse.json({ error: "unknown_postcode_district" }, { status: 400 });
    if (message.includes("unknown_trade")) return NextResponse.json({ error: "profile_not_recognised" }, { status: 400 });
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
  return NextResponse.json({
    ok: true,
    ...result,
    teaser,
    market_breakdown: marketBreakdown,
    signal_breakdown: signalBreakdown,
    normalized_profile: normalisedProfile,
    matched_trade_slug: tradeSlug,
  });
}
