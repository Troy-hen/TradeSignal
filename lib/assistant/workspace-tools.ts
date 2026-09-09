import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";

type PropertyPriorityContext = {
  timingSignal: "strong" | "positive" | "neutral" | "caution";
  latestTriggerDate: string | null;
  planningRecordCount: number;
};

export async function getWorkspaceSnapshot(companyId: string) {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const opportunities = await getCompanyOpportunities(companyId, { limit: 300 });
  const opportunityIds = opportunities.map((item) => item.opportunityId);

  const [{ data: claims }, { data: followUps }, { data: nearby }, { data: propertyRows }] = await Promise.all([
    supabase.from("territory_claims").select("territory_id").eq("company_id", companyId).eq("status", "active"),
    supabase.from("lead_follow_ups").select("id,lead_match_id,due_at,note,status").eq("company_id", companyId).eq("status", "pending").order("due_at").limit(50),
    db.rpc("browse_nearby_opportunities", { p_limit: 12 }),
    opportunityIds.length
      ? db.from("property_intelligence_records").select("opportunity_id,timing_signal,latest_trigger_date,planning_history").eq("company_id", companyId).in("opportunity_id", opportunityIds)
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
    .sort((a, b) => priorityScore(b, propertyByOpportunity.get(b.opportunityId)) - priorityScore(a, propertyByOpportunity.get(a.opportunityId)))
    .slice(0, 12)
    .map((item) => toAssistantOpportunity(item, propertyByOpportunity.get(item.opportunityId)));

  const pipelineValue = opportunities.reduce((sum, item) => {
    if (["won", "lost"].includes(item.currentAction ?? "")) return sum;
    return sum + Number(item.valueHigh ?? item.valueLow ?? 0);
  }, 0);
  const wonValue = opportunities.reduce((sum, item) => item.currentAction === "won" ? sum + Number(item.valueHigh ?? item.valueLow ?? 0) : sum, 0);
  const quotedValue = opportunities.reduce((sum, item) => item.currentAction === "quoted" ? sum + Number(item.valueHigh ?? item.valueLow ?? 0) : sum, 0);
  const monthlySpend = territories.reduce((sum, row) => sum + row.monthly_price_pence / 100, 0);

  return {
    coverage: territories,
    portfolio: {
      totalOpportunities: opportunities.length,
      openOpportunities: opportunities.filter((item) => !["won", "lost"].includes(item.currentAction ?? "")).length,
      pipelineValue,
      quotedValue,
      wonValue,
      monthlySpend,
      estimatedRoi: monthlySpend > 0 ? wonValue / monthlySpend : null,
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

function priorityScore(item: Awaited<ReturnType<typeof getCompanyOpportunities>>[number], property?: PropertyPriorityContext) {
  let score = Number(item.score ?? 0);
  if (item.planningStatus === "approved") score += 20;
  if (item.currentAction === null) score += 8;
  if (item.currentAction === "saved") score += 4;
  if (item.recommendedContactTiming) score += 3;
  score += Math.min(12, Number(item.valueHigh ?? item.valueLow ?? 0) / 10000);

  // Property intelligence is intentionally a modest tie-breaker, not part of the
  // deterministic opportunity score, until outcome data proves predictive value.
  if (property?.timingSignal === "strong") score += 8;
  else if (property?.timingSignal === "positive") score += 4;
  else if (property?.timingSignal === "caution") score -= 2;
  if ((property?.planningRecordCount ?? 0) > 1) score += Math.min(3, property!.planningRecordCount - 1);
  return score;
}

function toAssistantOpportunity(item: Awaited<ReturnType<typeof getCompanyOpportunities>>[number], property?: PropertyPriorityContext) {
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
  };
}
