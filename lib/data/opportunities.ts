import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type OpportunityBucket = Database["public"]["Enums"]["opportunity_bucket"];
export type OpportunityActionFilter = "new" | "saved" | "contacted" | "quoted" | "won" | "lost";

export interface OpportunityListItem {
  leadMatchId: string;
  opportunityId: string;
  score: number | null;
  bucket: string | null;
  projectType: string | null;
  district: string;
  tradeName: string;
  planningStatus: string;
  isCommercial: boolean | null;
  valueLow: number | null;
  valueHigh: number | null;
  receivedDate: string | null;
  decisionDate: string | null;
  currentAction: string | null;
  matchedAt: string;
  summary: string | null;
  likelyStartWindow: string | null;
  opportunityTiming: string | null;
  projectSizeCategory: string | null;
  classificationStatus: string | null;
  fitScore: number | null;
  aiConfidence: number | null;
  recommendedAction: string | null;
  recommendedContactTiming: string | null;
  riskFlags: string[] | null;
  canonicalOpportunityId?: string;
  entityName?: string | null;
  locationLabel?: string | null;
  signalFamily?: string | null;
  sourceKind?: string | null;
  signalCount?: number | null;
  likelyRequirements?: string[];
  matchReasons?: string[];
}

/**
 * Flat queries + in-memory joins rather than a nested embed — simpler to
 * get right than guessing multi-hop embed syntax, and the data volumes
 * here (one company's own matches) are small. lead_match_current_state
 * (RLS-respecting view) supplies the derived New/Saved/.../Lost state.
 */
export async function getCompanyOpportunities(
  companyId: string,
  opts?: { bucket?: OpportunityBucket; action?: OpportunityActionFilter; limit?: number },
): Promise<OpportunityListItem[]> {
  const canonical = await getCanonicalCompanyOpportunities(companyId, opts);
  return canonical.length > 0 ? canonical : getLegacyCompanyOpportunities(companyId, opts);
}

type GraphMatch = {
  id: string;
  opportunity_id: string;
  company_id: string;
  legacy_lead_match_id: string | null;
  match_score: number | string | null;
  match_reasons: unknown;
  status: string | null;
  matched_at: string | null;
};

type GraphOpportunity = {
  id: string;
  legacy_application_trade_opportunity_id: string | null;
  entity_id: string;
  location_id: string | null;
  title: string;
  status: string | null;
  score: number | string | null;
  temperature: string | null;
  buying_window_start: string | null;
  buying_window_end: string | null;
  why_now: string | null;
  likely_requirements: unknown;
  source_attribution: unknown;
  detected_at: string | null;
  b2b_eligible: boolean;
  customer_visible: boolean;
};

async function getCanonicalCompanyOpportunities(
  companyId: string,
  opts?: { bucket?: OpportunityBucket; action?: OpportunityActionFilter; limit?: number },
): Promise<OpportunityListItem[]> {
  const supabase = await createClient();
  const { data: rawMatches, error: matchError } = await supabase
    .from("opportunity_customer_matches")
    .select("id, opportunity_id, company_id, legacy_lead_match_id, match_score, match_reasons, status, matched_at")
    .eq("company_id", companyId)
    .neq("status", "dismissed")
    .order("matched_at", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (matchError || !rawMatches?.length) return [];

  const matches = rawMatches as unknown as GraphMatch[];
  const legacyMatchIds = matches.map((match) => match.legacy_lead_match_id).filter((id): id is string => Boolean(id));
  const { data: rawStates } = legacyMatchIds.length > 0
    ? await supabase.from("lead_match_current_state").select("lead_match_id, current_action").eq("company_id", companyId).in("lead_match_id", legacyMatchIds)
    : { data: [] };
  const stateById = new Map((rawStates ?? []).map((row) => [row.lead_match_id, row.current_action]));
  const visibleMatches = opts?.action
    ? matches.filter((match) => {
        const action = match.legacy_lead_match_id ? stateById.get(match.legacy_lead_match_id) ?? null : null;
        return opts.action === "new" ? action === null : action === opts.action;
      })
    : matches;
  if (!visibleMatches.length) return [];

  const graphIds = visibleMatches.map((match) => match.opportunity_id);
  const { data: rawOpportunities } = await supabase
    .from("opportunities")
    .select("id, legacy_application_trade_opportunity_id, entity_id, location_id, title, status, score, temperature, buying_window_start, buying_window_end, why_now, likely_requirements, source_attribution, detected_at, b2b_eligible, customer_visible")
    .in("id", graphIds)
    .eq("b2b_eligible", true)
    .eq("customer_visible", true);
  const opportunities = (rawOpportunities ?? []) as unknown as GraphOpportunity[];
  if (!opportunities.length) return [];

  const opportunityById = new Map(opportunities.map((row) => [row.id, row]));
  const entityIds = [...new Set(opportunities.map((row) => row.entity_id))];
  const locationIds = [...new Set(opportunities.map((row) => row.location_id).filter((id): id is string => Boolean(id)))];
  const legacyIds = [...new Set(opportunities.map((row) => row.legacy_application_trade_opportunity_id).filter((id): id is string => Boolean(id)))];

  const [{ data: entities }, { data: locations }, { data: links }, { data: legacyOpportunities }] = await Promise.all([
    entityIds.length ? supabase.from("business_entities").select("id, canonical_name, legal_name, entity_type").in("id", entityIds) : Promise.resolve({ data: [] }),
    locationIds.length ? supabase.from("business_locations").select("id, postcode_district, town_city, address_text").in("id", locationIds) : Promise.resolve({ data: [] }),
    supabase.from("opportunity_signals").select("opportunity_id, signal_id").in("opportunity_id", graphIds),
    legacyIds.length ? supabase.from("application_trade_opportunities").select("id, opportunity_score, opportunity_bucket, postcode_district, trade_category_id, application_classification_id, estimated_trade_value_low, estimated_trade_value_high, fit_score, ai_confidence, likely_scope, recommended_action, recommended_contact_timing, risk_flags, planning_application_id").in("id", legacyIds) : Promise.resolve({ data: [] }),
  ]);

  const entityById = new Map((entities ?? []).map((row) => [row.id, row]));
  const locationById = new Map((locations ?? []).map((row) => [row.id, row]));
  const legacyById = new Map((legacyOpportunities ?? []).map((row) => [row.id, row]));
  const signalLinks = (links ?? []) as Array<{ opportunity_id: string; signal_id: string }>;
  const signalIds = [...new Set(signalLinks.map((row) => row.signal_id))];
  const { data: signals } = signalIds.length
    ? await supabase.from("signals").select("id, signal_type, signal_family, interpretation, confidence, buying_window_start, buying_window_end").in("id", signalIds)
    : { data: [] };
  const signalById = new Map((signals ?? []).map((row) => [row.id, row]));
  const signalCountByOpportunity = new Map<string, number>();
  const signalRowsByOpportunity = new Map<string, Array<Record<string, unknown>>>();
  for (const link of signalLinks) {
    const signal = signalById.get(link.signal_id);
    if (!signal) continue;
    signalCountByOpportunity.set(link.opportunity_id, (signalCountByOpportunity.get(link.opportunity_id) ?? 0) + 1);
    const rows = signalRowsByOpportunity.get(link.opportunity_id) ?? [];
    rows.push(signal as unknown as Record<string, unknown>);
    signalRowsByOpportunity.set(link.opportunity_id, rows);
  }

  const legacyTradeIds = [...new Set((legacyOpportunities ?? []).map((row) => row.trade_category_id))];
  const legacyClassIds = [...new Set((legacyOpportunities ?? []).map((row) => row.application_classification_id))];
  const legacyAppIds = [...new Set((legacyOpportunities ?? []).map((row) => row.planning_application_id))];
  const [{ data: trades }, { data: classifications }, { data: applications }] = await Promise.all([
    legacyTradeIds.length ? supabase.from("trade_categories").select("id, name").in("id", legacyTradeIds) : Promise.resolve({ data: [] }),
    legacyClassIds.length ? supabase.from("application_classifications").select("id, project_type, summary, likely_start_window, opportunity_timing, project_size_category, ai_confidence, classification_status").in("id", legacyClassIds) : Promise.resolve({ data: [] }),
    legacyAppIds.length ? supabase.from("planning_applications").select("id, status, received_date, decision_date, is_commercial").in("id", legacyAppIds) : Promise.resolve({ data: [] }),
  ]);
  const tradeById = new Map((trades ?? []).map((row) => [row.id, row]));
  const classById = new Map((classifications ?? []).map((row) => [row.id, row]));
  const appById = new Map((applications ?? []).map((row) => [row.id, row]));

  const items: OpportunityListItem[] = [];
  for (const match of visibleMatches) {
    const graph = opportunityById.get(match.opportunity_id);
    if (!graph) continue;
    const legacy = graph.legacy_application_trade_opportunity_id ? legacyById.get(graph.legacy_application_trade_opportunity_id) : null;
    const classification = legacy ? classById.get(legacy.application_classification_id) : null;
    const application = legacy ? appById.get(legacy.planning_application_id) : null;
    const entity = entityById.get(graph.entity_id);
    const location = graph.location_id ? locationById.get(graph.location_id) : null;
    const graphSignals = signalRowsByOpportunity.get(graph.id) ?? [];
    const firstSignal = graphSignals[0] ?? {};
    const score = Number(match.match_score ?? graph.score ?? 0);
    const bucket = legacy?.opportunity_bucket ?? bucketForScore(score);
    if (opts?.bucket && bucket !== opts.bucket) continue;
    const currentAction = match.legacy_lead_match_id ? stateById.get(match.legacy_lead_match_id) ?? null : null;
    const likelyRequirements = stringList(graph.likely_requirements);
    const matchReasons = stringList(match.match_reasons);
    const locationLabel = [location?.postcode_district, location?.town_city].filter(Boolean).join(" · ") || "UK coverage";
    const signalFamily = typeof firstSignal.signal_family === "string" ? firstSignal.signal_family : null;
    items.push({
      leadMatchId: match.legacy_lead_match_id ?? match.id,
      opportunityId: legacy?.id ?? graph.id,
      canonicalOpportunityId: graph.id,
      score,
      bucket,
      projectType: classification?.project_type ?? graph.title,
      district: location?.postcode_district ?? legacy?.postcode_district ?? "UK",
      tradeName: tradeById.get(legacy?.trade_category_id ?? "")?.name ?? "Matched business profile",
      planningStatus: application?.status ?? graph.status ?? "current_signal",
      isCommercial: application?.is_commercial ?? true,
      valueLow: legacy?.estimated_trade_value_low ?? null,
      valueHigh: legacy?.estimated_trade_value_high ?? null,
      receivedDate: application?.received_date ?? graph.detected_at,
      decisionDate: application?.decision_date ?? null,
      currentAction,
      matchedAt: match.matched_at ?? "",
      summary: classification?.summary ?? graph.why_now,
      likelyStartWindow: classification?.likely_start_window ?? graph.buying_window_start,
      opportunityTiming: classification?.opportunity_timing ?? graph.buying_window_end,
      projectSizeCategory: classification?.project_size_category ?? null,
      classificationStatus: classification?.classification_status ?? null,
      fitScore: Number(match.match_score ?? legacy?.fit_score ?? graph.score ?? 0),
      aiConfidence: classification?.ai_confidence ?? (typeof firstSignal.confidence === "number" ? firstSignal.confidence : null),
      recommendedAction: legacy?.recommended_action ?? (stringList(graph.likely_requirements).join(", ") || null),
      recommendedContactTiming: legacy?.recommended_contact_timing ?? null,
      riskFlags: legacy?.risk_flags ?? null,
      entityName: entity?.canonical_name ?? entity?.legal_name ?? null,
      locationLabel,
      signalFamily,
      sourceKind: typeof firstSignal.signal_type === "string" ? firstSignal.signal_type : "unified_intelligence",
      signalCount: signalCountByOpportunity.get(graph.id) ?? 0,
      likelyRequirements,
      matchReasons,
    });
  }
  return items;
}

function bucketForScore(score: number): string {
  if (score >= 90) return "hot";
  if (score >= 75) return "strong";
  if (score >= 50) return "possible";
  return "low";
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return typeof value === "string" && value.trim() ? [value] : [];
}

async function getLegacyCompanyOpportunities(
  companyId: string,
  opts?: { bucket?: OpportunityBucket; action?: OpportunityActionFilter; limit?: number },
): Promise<OpportunityListItem[]> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("lead_match_current_state")
    .select("lead_match_id, application_trade_opportunity_id, matched_at, current_action")
    .eq("company_id", companyId)
    .order("matched_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (!matches || matches.length === 0) return [];

  const visibleMatches = opts?.action
    ? matches.filter((match) => (opts.action === "new" ? match.current_action === null : match.current_action === opts.action))
    : matches;
  if (visibleMatches.length === 0) return [];

  const oppIds = visibleMatches
    .map((m) => m.application_trade_opportunity_id)
    .filter((id): id is string => id !== null);
  if (oppIds.length === 0) return [];

  let oppQuery = supabase
    .from("application_trade_opportunities")
    .select(
      "id, opportunity_score, opportunity_bucket, postcode_district, trade_category_id, application_classification_id, estimated_trade_value_low, estimated_trade_value_high, fit_score, ai_confidence, likely_scope, recommended_action, recommended_contact_timing, risk_flags, planning_application_id",
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
    supabase
      .from("application_classifications")
      .select("id, project_type, summary, likely_start_window, opportunity_timing, project_size_category, ai_confidence, classification_status")
      .in("id", classIds),
    supabase.from("planning_applications").select("id, status, received_date, decision_date, is_commercial").in("id", appIds),
  ]);

  const tradeById = new Map((trades ?? []).map((t) => [t.id, t]));
  const classById = new Map((classifications ?? []).map((c) => [c.id, c]));
  const appById = new Map((applications ?? []).map((a) => [a.id, a]));

  const items: OpportunityListItem[] = [];
  for (const m of visibleMatches) {
    if (!m.application_trade_opportunity_id || !m.lead_match_id) continue;
    const opp = oppById.get(m.application_trade_opportunity_id);
    if (!opp) continue;

    const trade = tradeById.get(opp.trade_category_id);
    const cls = classById.get(opp.application_classification_id);
    const app = appById.get(opp.planning_application_id);

    items.push({
      leadMatchId: m.lead_match_id,
      opportunityId: opp.id,
      score: opp.opportunity_score,
      bucket: opp.opportunity_bucket,
      projectType: cls?.project_type ?? null,
      summary: cls?.summary ?? null,
      likelyStartWindow: cls?.likely_start_window ?? null,
      opportunityTiming: cls?.opportunity_timing ?? null,
      projectSizeCategory: cls?.project_size_category ?? null,
      classificationStatus: cls?.classification_status ?? null,
      fitScore: opp.fit_score ?? null,
      aiConfidence: opp.ai_confidence ?? null,
      recommendedAction: opp.recommended_action ?? null,
      recommendedContactTiming: opp.recommended_contact_timing ?? null,
      riskFlags: opp.risk_flags ?? null,
      district: opp.postcode_district,
      tradeName: trade?.name ?? "Trade",
      planningStatus: app?.status ?? "unknown",
      isCommercial: app?.is_commercial ?? null,
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
