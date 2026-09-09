import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyIntelligenceProvider } from "@/lib/property-intelligence";

const CACHE_DAYS = 7;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;

  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!opportunity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data } = await db
    .from("property_intelligence_records")
    .select(safeSelect())
    .eq("company_id", company.id)
    .eq("opportunity_id", id)
    .order("retrieved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    configured: Boolean(getPropertyIntelligenceProvider()),
    intelligence: data ?? null,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const provider = getPropertyIntelligenceProvider();
  if (!provider) return NextResponse.json({ error: "property_intelligence_not_configured" }, { status: 503 });

  let refresh = false;
  try {
    const body = (await request.json()) as { refresh?: boolean };
    refresh = body.refresh === true;
  } catch {
    // Empty body is valid; use the cached record where possible.
  }

  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("id, planning_application_id")
    .eq("id", id)
    .maybeSingle();
  if (!opportunity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: application } = await supabase
    .from("planning_applications")
    .select("id,address_text,postcode")
    .eq("id", opportunity.planning_application_id)
    .maybeSingle();
  if (!application) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!application.address_text || !application.postcode) {
    return NextResponse.json({ error: "property_address_incomplete" }, { status: 422 });
  }

  if (!refresh) {
    const { data: cached } = await db
      .from("property_intelligence_records")
      .select(safeSelect())
      .eq("company_id", company.id)
      .eq("opportunity_id", id)
      .eq("provider", provider.name)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached) return NextResponse.json({ intelligence: cached, cached: true });
  }

  try {
    const snapshot = await provider.enrichProperty({
      address: application.address_text,
      postcode: application.postcode,
    });
    if (!snapshot) {
      return NextResponse.json(
        { error: "property_not_matched", message: "The project address could not be matched confidently to a TwentyCI property record." },
        { status: 404 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: saved, error } = await admin
      .from("property_intelligence_records")
      .upsert(
        {
          company_id: company.id,
          opportunity_id: id,
          planning_application_id: application.id,
          provider: snapshot.provider,
          uprn: snapshot.uprn,
          match_method: snapshot.matchMethod,
          match_confidence: snapshot.matchConfidence,
          matched_address: snapshot.matchedAddress,
          postcode: snapshot.postcode,
          estimated_value_gbp: snapshot.estimatedValueGbp,
          value_min_gbp: snapshot.valueMinGbp,
          value_max_gbp: snapshot.valueMaxGbp,
          avm_confidence: snapshot.avmConfidence,
          bedrooms: snapshot.bedrooms,
          bathrooms: snapshot.bathrooms,
          garden: snapshot.garden,
          parking: snapshot.parking,
          latest_trigger_type: snapshot.latestTriggerType,
          latest_trigger_date: snapshot.latestTriggerDate,
          last_transaction_date: snapshot.lastTransactionDate,
          last_transaction_price_gbp: snapshot.lastTransactionPriceGbp,
          likely_to_sell_percentile: snapshot.likelyToSellPercentile,
          timing_signal: snapshot.activitySignal,
          timing_reasons: snapshot.activityReasons,
          trigger_history: snapshot.triggerHistory,
          transaction_history: snapshot.transactionHistory,
          retrieved_at: now.toISOString(),
          expires_at: expiresAt,
          updated_at: now.toISOString(),
        },
        { onConflict: "company_id,opportunity_id,provider" },
      )
      .select(safeSelect())
      .single();
    if (error || !saved) throw error ?? new Error("Property intelligence persistence failed");

    await db.from("opportunity_activity_events").insert({
      company_id: company.id,
      opportunity_id: id,
      event_type: "property_intelligence_refreshed",
      channel: "data",
      provider: snapshot.provider,
      metadata: {
        uprn: snapshot.uprn,
        match_confidence: snapshot.matchConfidence,
        timing_signal: snapshot.activitySignal,
      },
      created_by: user.id,
    });

    return NextResponse.json({ intelligence: saved, cached: false });
  } catch (error) {
    console.error("Property intelligence enrichment failed", error);
    return NextResponse.json({ error: "property_intelligence_failed" }, { status: 502 });
  }
}

function safeSelect() {
  return [
    "id",
    "provider",
    "uprn",
    "match_method",
    "match_confidence",
    "matched_address",
    "postcode",
    "estimated_value_gbp",
    "value_min_gbp",
    "value_max_gbp",
    "avm_confidence",
    "bedrooms",
    "bathrooms",
    "garden",
    "parking",
    "latest_trigger_type",
    "latest_trigger_date",
    "last_transaction_date",
    "last_transaction_price_gbp",
    "likely_to_sell_percentile",
    "timing_signal",
    "timing_reasons",
    "trigger_history",
    "transaction_history",
    "retrieved_at",
    "expires_at",
  ].join(",");
}
