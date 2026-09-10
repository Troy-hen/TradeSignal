import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichWithEpc, isEpcIntelligenceConfigured } from "@/lib/property-intelligence/epc";

const CACHE_DAYS = 30;

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
    .from("epc_intelligence_records")
    .select(safeSelect())
    .eq("company_id", company.id)
    .eq("opportunity_id", id)
    .maybeSingle();

  return NextResponse.json({ configured: isEpcIntelligenceConfigured(), intelligence: data ?? null });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isEpcIntelligenceConfigured()) return NextResponse.json({ error: "epc_not_configured" }, { status: 503 });

  let refresh = false;
  try {
    const body = (await request.json()) as { refresh?: boolean };
    refresh = body.refresh === true;
  } catch {
    // Empty body is valid.
  }

  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("id,planning_application_id")
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
      .from("epc_intelligence_records")
      .select(safeSelect())
      .eq("company_id", company.id)
      .eq("opportunity_id", id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached) return NextResponse.json({ intelligence: cached, cached: true });
  }

  try {
    const snapshot = await enrichWithEpc({ address: application.address_text, postcode: application.postcode });
    if (!snapshot) {
      return NextResponse.json(
        { error: "epc_not_matched", message: "No sufficiently confident domestic EPC match was found for this project address." },
        { status: 404 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: saved, error } = await admin
      .from("epc_intelligence_records")
      .upsert({
        company_id: company.id,
        opportunity_id: id,
        planning_application_id: application.id,
        certificate_number: snapshot.certificateNumber,
        uprn: snapshot.uprn,
        matched_address: snapshot.matchedAddress,
        postcode: snapshot.postcode,
        match_confidence: snapshot.matchConfidence,
        current_band: snapshot.currentBand,
        current_efficiency: snapshot.currentEfficiency,
        potential_band: snapshot.potentialBand,
        potential_efficiency: snapshot.potentialEfficiency,
        property_type: snapshot.propertyType,
        built_form: snapshot.builtForm,
        floor_area: snapshot.floorArea,
        construction_age_band: snapshot.constructionAgeBand,
        main_heating_description: snapshot.mainHeatingDescription,
        main_fuel: snapshot.mainFuel,
        roof_description: snapshot.roofDescription,
        windows_description: snapshot.windowsDescription,
        walls_description: snapshot.wallsDescription,
        mains_gas: snapshot.mainsGas,
        solar_water_heating: snapshot.solarWaterHeating,
        improvement_signals: snapshot.improvementSignals,
        signal_summary: snapshot.signalSummary,
        registration_date: snapshot.registrationDate,
        retrieved_at: now.toISOString(),
        expires_at: expiresAt,
        updated_at: now.toISOString(),
      }, { onConflict: "company_id,opportunity_id" })
      .select(safeSelect())
      .single();
    if (error || !saved) throw error ?? new Error("EPC intelligence persistence failed");

    await admin.from("opportunity_activity_events").insert({
      company_id: company.id,
      opportunity_id: id,
      event_type: "epc_intelligence_refreshed",
      channel: "data",
      provider: "mhclg-epc",
      metadata: {
        certificate_number: snapshot.certificateNumber,
        match_confidence: snapshot.matchConfidence,
        current_band: snapshot.currentBand,
        potential_band: snapshot.potentialBand,
        signal_count: snapshot.improvementSignals.length,
      },
      created_by: user.id,
    });

    return NextResponse.json({ intelligence: saved, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("EPC intelligence enrichment failed", error);
    if (message === "EPC_API_AUTH_FAILED") return NextResponse.json({ error: "epc_auth_failed" }, { status: 503 });
    if (message === "EPC_API_RATE_LIMITED") return NextResponse.json({ error: "epc_rate_limited" }, { status: 429 });
    return NextResponse.json({ error: "epc_intelligence_failed" }, { status: 502 });
  }
}

function safeSelect() {
  return [
    "id", "certificate_number", "uprn", "matched_address", "postcode", "match_confidence",
    "current_band", "current_efficiency", "potential_band", "potential_efficiency", "property_type", "built_form",
    "floor_area", "construction_age_band", "main_heating_description", "main_fuel", "roof_description",
    "windows_description", "walls_description", "mains_gas", "solar_water_heating", "improvement_signals",
    "signal_summary", "registration_date", "retrieved_at", "expires_at",
  ].join(",");
}
