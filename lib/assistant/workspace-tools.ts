import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { getOwnedMarketSignals } from "@/lib/data/trade-intelligence";
import { getNewWorkspaceQuoteRequests } from "@/lib/data/quote-requests";

type PropertyPriorityContext = {
  timingSignal: "strong" | "positive" | "neutral" | "caution";
  latestTriggerDate: string | null;
  planningRecordCount: number;
};

type EpcPriorityContext = {
  currentBand: string | null;
  potentialBand: string | null;
  currentEfficiency: number | null;
  potentialEfficiency: number | null;
  signalCount: number;
  signalSummary: string | null;
};

export async function getWorkspaceSnapshot(companyId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const [opportunities, marketSignals, inboundQuoteRequests] = await Promise.all([
    getCompanyOpportunities(companyId, { limit: 300 }),
    getOwnedMarketSignals(300),
    getNewWorkspaceQuoteRequests(companyId, 20),
  ]);
  const opportunityIds = opportunities.map((item) => item.opportunityId);

  const [{ data: claims }, { data: followUps }, { data: nearby }, { data: propertyRows }, { data: epcRows }] = await Promise.all([
    supabase.from("territory_claims").select("territory_id").eq("company_id", companyId).eq("status", "active"),
    supabase.from("lead_follow_ups").select("id,lead_match_id,due_at,note,status").eq("company_id", companyId).eq("status", "pending").order("due_at").limit(50),
    db.rpc("browse_nearby_opportunities", { p_limit: 12 }),
    opportunityIds.length
      ? db.from("property_intelligence_records").select("opportunity_id,timing_signal,latest_trigger_date,planning_history").eq("company_id", companyId).in("opportunity_id", opportunityIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    opportunityIds.length
      ? db.from("epc_intelligence_records").select("opportunity_id,current_band,current_efficiency,potential_band,potential_efficiency,improvement_signals,signal_summary").eq("company_id", companyId).in("opportunity_id", opportunityIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const propertyByOpportunity = new Map<string, PropertyPriorityContext>();
  for (const row of (propertyRows ?? []) as Array<Record<string, unknown>>) {
    const opportunityId = typeof row.opportunity_id === "string" ? row.opportunity_id : null;
    if (!opportunityId) continue;
    const planningHistory = Array.isArray(row.planning_history) ? row.planning_history : [];
    const timingSignal = ["strong", "positive", "neutral", "caution"].includes(String(row.timing_signal))
      ? (row.timing_signal as PropertyPriorityContext["timingSignal"])
      : "neutral";
    propertyByOpportunity.set(opportunityId, {
      timingSignal,
      latestTriggerDate: typeof row.latest_trigger_date === "string" ? row.latest_trigger_date : null,
      planningRecordCount: planningHistory.length,
    });
  }

  const epcByOpportunity = new Map<string, EpcPriorityContext>();
  for (const row of (epcRows ?? []) as Array<Record<string, unknown>>) {
    const opportunityId = typeof row.opportunity_id === "string" ? row.opportunity_id : null;
    if (!opportunityId) continue;
    const improvementSignals = Array.isArray(row.improvement_signals) ? row.improvement_signals : [];
    epcByOpportunity.set(opportunityId, {
      currentBand: typeof row.current_band === "string" ? row.current_band : null,
      potentialBand: typeof row.potential_band === "string" ? row.potential_band : null,
      currentEfficiency: toNumber(row.current_efficiency),
      potentialEfficiency: toNumber(row.potential_efficiency),
      signalCount: improvementSignals.length,
      signalSummary: typeof row.signal_summary === "string" ? row.signal_summary : null,
    });
  }

  const territoryIds = [...new Set((claims ?? []).map((row) => row.territory_id))];
  let territories: Array<{ postcode_district: string; monthly_price_pence: number; trade_name: string }> = [];
  if (territoryIds.length) {
    const { data: territoryRows } = await supabase.from("territories").select("id,postcode_district,monthly_price_pence,trade_category_id").in("id", territoryIds);
    const tradeIds = [...new Set((territoryRows ?? []).map((row) => row.trade_category_id))];
    const { data: trades } = tradeIds.length
      ? await supabase.from("trade_categories").select("id,name").in("id", tradeIds)
      : { data: [] as Array<{ id: string; name: string }> };
    const tradeById = new Map((trades ?? []).map((row) => [row.id, row.name]));
    territories = (territoryRows ?? []).map((row) => ({
      postcode_district: row.postcode_district,
      monthly_price_pence: row.monthly_price_pence,
      trade_name: tradeById.get(row.trade_category_id) ?? "Trade",
    }));
  }

  const leadMatchIds = [...new Set((followUps ?? []).map((row) => row.lead_match_id).filter(Boolean))];
  const matchById = new Map<string, string>();
  if (leadMatchIds.length) {
    const { data: matches } = await supabase.from("lead_matches").select("id,application_trade_opportunity_id").in("id", leadMatchIds);
    for (const row of matches ?? []) if (row.id && row.application_trade_opportunity_id) matchById.set(row.id, row.application_trade_opportunity_id);
  }
  const opportunityById = new Map(opportunities.map((item) => [item.opportunityId, item]));

  const ranked = [...opportunities]
    .filter((item) => !["won", "lost"].includes(item.currentAction ?? ""))
    .sort((a, b) => priorityScore(b, propertyByOpportunity.get(b.opportunityId), epcByOpportunity.get(b.opportunityId)) - priorityScore(a, propertyByOpportunity.get(a.opportunityId), epcByOpportunity.get(a.opportunityId)))
    .slice(0, 12)
    .map((item) => toAssistantOpportunity(item, propertyByOpportunity.get(item.opportunityId), epcByOpportunity.get(item.opportunityId)));

  const rankedMarket = [...marketSignals]
    .filter((item) => !["won", "lost"].includes(item.current_action))
    .sort((a, b) => marketPriorityScore(b) - marketPriorityScore(a))
    .slice(0, 12)
    .map((item) => ({
      kind: "market_signal" as const,
      matchId: item.market_signal_trade_match_id,
      signalType: item.signal_type,
      title: item.title,
      postcodeDistrict: item.postcode_district,
      tradeName: item.trade_name,
      stage: item.current_action,
      procurementStage: item.procurement_stage,
      buyerName: item.buyer_name,
      deadlineAt: item.deadline_at,
      score: item.fit_score,
      bucket: item.opportunity_bucket,
      valueLow: item.estimated_trade_value_low,
      valueHigh: item.estimated_trade_value_high,
      recommendation: item.recommended_action,
    }));

  const planningPipeline = opportunities.reduce((sum, item) => ["won", "lost"].includes(item.currentAction ?? "") ? sum : sum + Number(item.valueHigh ?? item.valueLow ?? 0), 0);
  const marketPipeline = marketSignals.reduce((sum, item) => ["won", "lost"].includes(item.current_action) ? sum : sum + Number(item.estimated_trade_value_high ?? item.estimated_trade_value_low ?? 0), 0);
  const planningWon = opportunities.reduce((sum, item) => item.currentAction === "won" ? sum + Number(item.valueHigh ?? item.valueLow ?? 0) : sum, 0);
  const marketWon = marketSignals.reduce((sum, item) => item.current_action === "won" ? sum + Number(item.estimated_trade_value_high ?? item.estimated_trade_value_low ?? 0) : sum, 0);
  const planningQuoted = opportunities.reduce((sum, item) => item.currentAction === "quoted" ? sum + Number(item.valueHigh ?? item.valueLow ?? 0) : sum, 0);
  const marketQuoted = marketSignals.reduce((sum, item) => ["quoted", "bid_submitted"].includes(item.current_action) ? sum + Number(item.estimated_trade_value_high ?? item.estimated_trade_value_low ?? 0) : sum, 0);
  const monthlySpend = territories.reduce((sum, row) => sum + row.monthly_price_pence / 100, 0);

  return {
    coverage: territories,
    inboundQuoteRequests: inboundQuoteRequests.map((request) => ({
      id: request.id,
      name: request.name,
      audienceType: request.audienceType,
      preferredContactMethod: request.preferredContactMethod,
      submittedAt: request.submittedAt,
      opportunityId: request.opportunityId,
      marketSignalTradeMatchId: request.marketSignalTradeMatchId,
      message: request.message,
    })),
    marketOpportunities: rankedMarket,
    portfolio: {
      totalOpportunities: opportunities.length + marketSignals.length,
      planningOpportunities: opportunities.length,
      marketOpportunities: marketSignals.length,
      openOpportunities: opportunities.filter((item) => !["won", "lost"].includes(item.currentAction ?? "")).length + marketSignals.filter((item) => !["won", "lost"].includes(item.current_action)).length,
      pipelineValue: planningPipeline + marketPipeline,
      quotedValue: planningQuoted + marketQuoted,
      wonValue: planningWon + marketWon,
      monthlySpend,
      estimatedRoi: monthlySpend > 0 ? (planningWon + marketWon) / monthlySpend : null,
      rankedOpportunities: ranked,
    },
    followUps: (followUps ?? []).map((row) => {
      const opportunityId = matchById.get(row.lead_match_id);
      const item = opportunityId ? opportunityById.get(opportunityId) : null;
      return {
        id: row.id,
        dueAt: row.due_at,
        note: row.note,
        opportunityId: opportunityId ?? null,
        projectType: item?.projectType ?? null,
        postcodeDistrict: item?.district ?? null,
        tradeName: item?.tradeName ?? null,
      };
    }),
    nearbyExpansion: nearby ?? [],
  };
}

function priorityScore(item: Awaited<ReturnType<typeof getCompanyOpportunities>>[number], property?: PropertyPriorityContext, epc?: EpcPriorityContext) {
  let score = Number(item.score ?? 0);
  if (item.planningStatus === "approved") score += 20;
  if (item.currentAction === null) score += 8;
  if (item.currentAction === "saved") score += 4;
  if (item.recommendedContactTiming) score += 3;
  score += Math.min(12, Number(item.valueHigh ?? item.valueLow ?? 0) / 10000);
  if (property?.timingSignal === "strong") score += 8;
  else if (property?.timingSignal === "positive") score += 4;
  else if (property?.timingSignal === "caution") score -= 2;
  if ((property?.planningRecordCount ?? 0) > 1) score += Math.min(3, property!.planningRecordCount - 1);

  // EPC is supporting qualification context, never the dominant ranking factor.
  // A weak energy rating can add a small amount of relevance for a matched trade,
  // while the core planning/project score, value and timing continue to lead.
  if (epc?.currentBand && ["D", "E", "F", "G"].includes(epc.currentBand)) score += 2;
  if (epc?.currentEfficiency !== null && epc?.currentEfficiency !== undefined && epc?.potentialEfficiency !== null && epc?.potentialEfficiency !== undefined && epc.potentialEfficiency - epc.currentEfficiency >= 10) score += 1;
  score += Math.min(2, epc?.signalCount ?? 0);
  return score;
}

function marketPriorityScore(item: Awaited<ReturnType<typeof getOwnedMarketSignals>>[number]) {
  let score = Number(item.fit_score ?? 0);
  score += Math.min(12, Number(item.estimated_trade_value_high ?? item.estimated_trade_value_low ?? 0) / 25000);
  if (item.signal_type === "contract_award") score += 5;
  if (item.current_action === "new") score += 5;
  if (item.deadline_at) {
    const days = (Date.parse(item.deadline_at) - Date.now()) / 86_400_000;
    if (days >= 0 && days <= 7) score += 12;
    else if (days > 7 && days <= 21) score += 7;
  }
  return score;
}

function toAssistantOpportunity(item: Awaited<ReturnType<typeof getCompanyOpportunities>>[number], property?: PropertyPriorityContext, epc?: EpcPriorityContext) {
  return {
    opportunityId: item.opportunityId,
    postcodeDistrict: item.district,
    tradeName: item.tradeName,
    projectType: item.projectType,
    planningStatus: item.planningStatus,
    score: item.score,
    bucket: item.bucket,
    valueLow: item.valueLow,
    valueHigh: item.valueHigh,
    stage: item.currentAction ?? "new",
    likelyStart: item.likelyStartWindow,
    contactTiming: item.recommendedContactTiming,
    recommendation: item.recommendedAction,
    propertySignal: property?.timingSignal ?? null,
    propertyLatestTriggerDate: property?.latestTriggerDate ?? null,
    propertyPlanningRecordCount: property?.planningRecordCount ?? 0,
    epc: epc ? {
      currentBand: epc.currentBand,
      potentialBand: epc.potentialBand,
      currentEfficiency: epc.currentEfficiency,
      potentialEfficiency: epc.potentialEfficiency,
      signalCount: epc.signalCount,
      summary: epc.signalSummary,
    } : null,
  };
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
