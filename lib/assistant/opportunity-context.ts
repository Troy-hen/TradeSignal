import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getStoredPropertyIntelligence } from "@/lib/data/property-intelligence";

export async function getCurrentOpportunityContext(companyId: string, opportunityId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("id,planning_application_id,application_classification_id,trade_category_id,opportunity_score,opportunity_bucket,estimated_trade_value_low,estimated_trade_value_high,recommended_action,recommended_contact_timing,likely_scope,match_reasons")
    .eq("id", opportunityId)
    .maybeSingle();
  if (!opportunity) return null;

  const [{ data: application }, { data: classification }, { data: trade }, propertyIntelligence, { data: epcIntelligence }] = await Promise.all([
    supabase
      .from("planning_applications")
      .select("address_text,postcode,postcode_district,status,planning_reference,proposal_description,received_date,decision_date,agent_company,applicant_name")
      .eq("id", opportunity.planning_application_id)
      .maybeSingle(),
    supabase
      .from("application_classifications")
      .select("project_type,summary,likely_start_window,estimated_total_project_value_low,estimated_total_project_value_high")
      .eq("id", opportunity.application_classification_id)
      .maybeSingle(),
    supabase.from("trade_categories").select("name,slug").eq("id", opportunity.trade_category_id).maybeSingle(),
    getStoredPropertyIntelligence(companyId, opportunityId),
    db
      .from("epc_intelligence_records")
      .select("current_band,current_efficiency,potential_band,potential_efficiency,property_type,built_form,floor_area,construction_age_band,main_heating_description,main_fuel,roof_description,windows_description,walls_description,improvement_signals,signal_summary,registration_date,retrieved_at")
      .eq("company_id", companyId)
      .eq("opportunity_id", opportunityId)
      .maybeSingle(),
  ]);

  if (!application) return null;
  return {
    opportunityId,
    trade: trade?.name ?? null,
    projectType: classification?.project_type ?? null,
    projectSummary: classification?.summary ?? null,
    planningStatus: application.status,
    planningReference: application.planning_reference,
    projectAddress: application.address_text,
    postcode: application.postcode,
    postcodeDistrict: application.postcode_district,
    proposal: application.proposal_description,
    receivedDate: application.received_date,
    decisionDate: application.decision_date,
    applicantName: application.applicant_name,
    planningAgent: application.agent_company,
    opportunityScore: opportunity.opportunity_score,
    opportunityBucket: opportunity.opportunity_bucket,
    estimatedTradeValueLow: opportunity.estimated_trade_value_low,
    estimatedTradeValueHigh: opportunity.estimated_trade_value_high,
    estimatedProjectValueLow: classification?.estimated_total_project_value_low ?? null,
    estimatedProjectValueHigh: classification?.estimated_total_project_value_high ?? null,
    likelyStart: classification?.likely_start_window ?? null,
    recommendedAction: opportunity.recommended_action,
    recommendedContactTiming: opportunity.recommended_contact_timing,
    likelyScope: opportunity.likely_scope,
    matchReasons: opportunity.match_reasons,
    propertyIntelligence,
    epcIntelligence: epcIntelligence ? {
      currentBand: epcIntelligence.current_band,
      currentEfficiency: toNumber(epcIntelligence.current_efficiency),
      potentialBand: epcIntelligence.potential_band,
      potentialEfficiency: toNumber(epcIntelligence.potential_efficiency),
      propertyType: epcIntelligence.property_type,
      builtForm: epcIntelligence.built_form,
      floorArea: toNumber(epcIntelligence.floor_area),
      constructionAgeBand: epcIntelligence.construction_age_band,
      heating: epcIntelligence.main_heating_description,
      fuel: epcIntelligence.main_fuel,
      roof: epcIntelligence.roof_description,
      windows: epcIntelligence.windows_description,
      walls: epcIntelligence.walls_description,
      improvementSignals: Array.isArray(epcIntelligence.improvement_signals)
        ? epcIntelligence.improvement_signals.filter((item): item is string => typeof item === "string")
        : [],
      summary: epcIntelligence.signal_summary,
      registrationDate: epcIntelligence.registration_date,
      retrievedAt: epcIntelligence.retrieved_at,
    } : null,
  };
}

export function opportunityIdFromContextPath(path: string | null | undefined) {
  if (!path) return null;
  const match = path.match(/^\/opportunities\/([0-9a-fA-F-]{36})(?:\/|$)/);
  return match?.[1] ?? null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
