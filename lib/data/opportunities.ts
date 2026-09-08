import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type OpportunityBucket = Database["public"]["Enums"]["opportunity_bucket"];

export interface OpportunityListItem {
  leadMatchId: string;
  opportunityId: string;
  score: number | null;
  bucket: string | null;
  projectType: string | null;
  district: string;
  tradeName: string;
  planningStatus: string;
  valueLow: number | null;
  valueHigh: number | null;
  receivedDate: string | null;
  decisionDate: string | null;
  currentAction: string | null;
  matchedAt: string;
}

/**
 * Flat queries + in-memory joins rather than a nested embed — simpler to
 * get right than guessing multi-hop embed syntax, and the data volumes
 * here (one company's own matches) are small. lead_match_current_state
 * (RLS-respecting view) supplies the derived New/Saved/.../Lost state.
 */
export async function getCompanyOpportunities(
  companyId: string,
  opts?: { bucket?: OpportunityBucket; limit?: number },
): Promise<OpportunityListItem[]> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("lead_match_current_state")
    .select("lead_match_id, application_trade_opportunity_id, matched_at, current_action")
    .eq("company_id", companyId)
    .order("matched_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (!matches || matches.length === 0) return [];

  const oppIds = matches
    .map((m) => m.application_trade_opportunity_id)
    .filter((id): id is string => id !== null);
  if (oppIds.length === 0) return [];

  let oppQuery = supabase
    .from("application_trade_opportunities")
    .select(
      "id, opportunity_score, opportunity_bucket, postcode_district, trade_category_id, application_classification_id, estimated_trade_value_low, estimated_trade_value_high, planning_application_id",
    )
    .in("id", oppIds);
  if (opts?.bucket) oppQuery = oppQuery.eq("opportunity_bucket", opts.bucket);

  const { data: opportunities } = await oppQuery;
  if (!opportunities || opportunities.length === 0) return [];

  const oppById = new Map(opportunities.map((o) => [o.id, o]));
  const tradeIds = [...new Set(opportunities.map((o) => o.trade_category_id))];
  const classIds = [...new Set(opportunities.map((o) => o.application_classification_id))];
  const appIds = [...new Set(opportunities.map((o) => o.planning_application_id))];

  const [{ data: trades }, { data: classifications }, { data: applications }] = await Promise.all([
    supabase.from("trade_categories").select("id, name").in("id", tradeIds),
    supabase.from("application_classifications").select("id, project_type").in("id", classIds),
    supabase.from("planning_applications").select("id, status, received_date, decision_date").in("id", appIds),
  ]);

  const tradeById = new Map((trades ?? []).map((t) => [t.id, t]));
  const classById = new Map((classifications ?? []).map((c) => [c.id, c]));
  const appById = new Map((applications ?? []).map((a) => [a.id, a]));

  const items: OpportunityListItem[] = [];
  for (const m of matches) {
    if (!m.application_trade_opportunity_id || !m.lead_match_id) continue;
    const opp = oppById.get(m.application_trade_opportunity_id);
    if (!opp) continue; // excluded by the bucket filter, or not (yet) RLS-visible

    const trade = tradeById.get(opp.trade_category_id);
    const cls = classById.get(opp.application_classification_id);
    const app = appById.get(opp.planning_application_id);

    items.push({
      leadMatchId: m.lead_match_id,
      opportunityId: opp.id,
      score: opp.opportunity_score,
      bucket: opp.opportunity_bucket,
      projectType: cls?.project_type ?? null,
      district: opp.postcode_district,
      tradeName: trade?.name ?? "Trade",
      planningStatus: app?.status ?? "unknown",
      valueLow: opp.estimated_trade_value_low,
      valueHigh: opp.estimated_trade_value_high,
      receivedDate: app?.received_date ?? null,
      decisionDate: app?.decision_date ?? null,
      currentAction: m.current_action,
      matchedAt: m.matched_at ?? "",
    });
  }

  return items;
}
