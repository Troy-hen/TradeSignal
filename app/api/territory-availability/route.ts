import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkEdgeRateLimit } from "@/lib/rate-limit";
import { normalisePostcodeDistrict } from "@/lib/postcode";
import { normaliseSellingProfile, type ProfileCandidate } from "@/lib/profile/normalise";

const querySchema = z.object({
  postcode: z.string().trim().min(2).max(8),
  profile: z.string().trim().min(1).max(500).optional(),
  trade: z.string().trim().min(1).max(120).optional(),
}).refine((query) => Boolean(query.profile || query.trade), { message: "profile is required" });

type PreviewRow = {
  source_kind: string;
  source_record_id: string;
  headline: string;
  stage: string | null;
  estimated_project_value_high: number | null;
  estimated_trade_value_low: number | null;
  estimated_trade_value_high: number | null;
  published_at: string | null;
  deadline_at: string | null;
  buyer_name: string | null;
  summary: string | null;
  recommended_action: string | null;
  access_level: "full" | "teaser";
  source_url: string | null;
  score: number | null;
  opportunity_bucket: string | null;
  profile_match: number | null;
};

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
  const candidatesQuery = await supabase.from("trade_categories").select("slug, name, description").eq("is_active", true).order("display_order").limit(250);
  const candidates = (candidatesQuery.data ?? []) as ProfileCandidate[];
  const profileText = parsed.data.profile ?? parsed.data.trade ?? "";
  const normalizedProfile = await normaliseSellingProfile(profileText, candidates);
  const { data: postcode } = await supabase.from("postcode_districts").select("id").eq("id", postcodeDistrict).maybeSingle();
  if (!postcode) return NextResponse.json({ error: "unknown_postcode_district" }, { status: 400 });

  const { data: feedData, error: feedError } = await supabase.rpc("browse_b2b_preview_feed", {
    p_postcode_district: postcodeDistrict,
    p_profile: normalizedProfile,
    p_limit: 100,
  });
  if (feedError) {
    console.error("B2B public preview failed", feedError);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const feed = (feedData ?? []) as PreviewRow[];
  const result = feed[0] ?? null;
  const marketCounts = new Map<string, number>();
  for (const row of feed) marketCounts.set(row.source_kind, (marketCounts.get(row.source_kind) ?? 0) + 1);
  const signalBreakdown = {
    hot: feed.filter((row) => row.opportunity_bucket === "hot").length,
    warm: feed.filter((row) => row.opportunity_bucket === "strong").length,
    early: feed.filter((row) => row.opportunity_bucket === "possible" || row.opportunity_bucket === "low").length,
  };

  return NextResponse.json({
    ok: true,
    applications_last_30d: feed.filter((row) => row.published_at && Date.parse(row.published_at) >= Date.now() - 30 * 24 * 60 * 60 * 1000).length,
    high_priority_count: signalBreakdown.hot,
    estimated_construction_activity_gbp: feed.reduce((sum, row) => sum + Number(row.estimated_project_value_high ?? 0), 0),
    estimated_trade_value_gbp: feed.reduce((sum, row) => sum + Number(row.estimated_trade_value_high ?? 0), 0),
    territory_status: "preview",
    monthly_price_pence: 2999,
    teaser: result ? {
      project_type: result.headline,
      planning_status: result.stage,
      estimated_trade_value_low: result.estimated_trade_value_low,
      estimated_trade_value_high: result.estimated_trade_value_high,
    } : null,
    market_breakdown: [...marketCounts.entries()].map(([key, count]) => ({ key, count })),
    signal_breakdown: signalBreakdown,
    normalized_profile: normalizedProfile,
    matched_trade_slug: null,
  });
}
