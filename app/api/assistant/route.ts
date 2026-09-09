import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getAssistantOpenAI, resolveTradeSlug, retrieveKnowledge, searchOpportunityTeasers } from "@/lib/assistant/retrieval";
import { searchMarketTradeSignals } from "@/lib/data/trade-intelligence";
import { getWorkspaceSnapshot } from "@/lib/assistant/workspace-tools";
import { getCurrentOpportunityContext, opportunityIdFromContextPath } from "@/lib/assistant/opportunity-context";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).default([]),
  contextPath: z.string().max(500).nullable().optional(),
});

const workspaceIntentSchema = z.enum(["none", "priorities", "coverage", "expansion", "roi", "followups"]);
const signalTypeSchema = z.enum(["tender", "public_pipeline", "contract_award", "commercial_development"]);
const plannerSchema = z.object({
  needsKnowledge: z.boolean(),
  needsOpportunitySearch: z.boolean(),
  needsMarketSignalSearch: z.boolean(),
  workspaceIntent: workspaceIntentSchema,
  location: z.string().nullable(),
  trade: z.string().nullable(),
  status: z.enum(["submitted","validated","under_consideration","decision_expected","approved","rejected","withdrawn","appeal_lodged","unknown"]).nullable(),
  signalType: signalTypeSchema.nullable(),
  limit: z.number().int().min(1).max(25).default(12),
});

export async function POST(request: Request) {
  const company = await requireCurrentCompany();
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const openai = getAssistantOpenAI();
  if (!openai) return NextResponse.json({ error: "assistant_not_configured" }, { status: 503 });

  try {
    const planner = await planRetrieval(openai, body.data.message, body.data.history);
    const needsWorkspace = planner.workspaceIntent !== "none";
    const currentOpportunityId = opportunityIdFromContextPath(body.data.contextPath);
    const tradeSlugPromise = (planner.needsOpportunitySearch || planner.needsMarketSignalSearch) ? resolveTradeSlug(planner.trade) : Promise.resolve(null);

    const [knowledge, opportunityResults, marketResults, workspace, currentOpportunity] = await Promise.all([
      planner.needsKnowledge ? retrieveKnowledge(body.data.message, 6) : Promise.resolve([]),
      planner.needsOpportunitySearch && planner.location
        ? tradeSlugPromise.then((tradeSlug) => searchOpportunityTeasers({ location: planner.location!, tradeSlug, status: planner.status, limit: planner.limit }))
        : Promise.resolve([]),
      planner.needsMarketSignalSearch && planner.location
        ? tradeSlugPromise.then((tradeSlug) => searchMarketTradeSignals({ location: planner.location!, tradeSlug, signalType: planner.signalType, limit: planner.limit }))
        : Promise.resolve([]),
      needsWorkspace ? getWorkspaceSnapshot(company.id) : Promise.resolve(null),
      currentOpportunityId ? getCurrentOpportunityContext(company.id, currentOpportunityId) : Promise.resolve(null),
    ]);

    const planningTotal = opportunityResults[0]?.total_matches ?? 0;
    const marketTotal = marketResults[0]?.total_matches ?? 0;
    const workspaceEvidence = workspace ? selectWorkspaceEvidence(workspace, planner.workspaceIntent) : null;
    const evidence = {
      knowledge: knowledge.map((item) => ({ title: item.document_title, category: item.category, content: item.content })),
      planningSearch: planner.needsOpportunitySearch ? {
        requestedLocation: planner.location,
        requestedTrade: planner.trade,
        requestedStatus: planner.status,
        totalMatches: planningTotal,
        returned: opportunityResults.length,
        results: opportunityResults,
      } : null,
      tradeIntelligenceSearch: planner.needsMarketSignalSearch ? {
        requestedLocation: planner.location,
        requestedTrade: planner.trade,
        requestedSignalType: planner.signalType,
        totalMatches: marketTotal,
        returned: marketResults.length,
        results: marketResults,
      } : null,
      workspace: workspaceEvidence,
      currentOpportunity,
    };

    const response = await openai.responses.create({
      model: process.env.ASK_MYTRADEBOX_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "system",
          content: `You are Ask MyTradeBox, a concise commercial assistant for UK trade businesses. Answer only from supplied evidence and ordinary non-sensitive reasoning. Never invent live data. MyTradeBox opportunities can originate from planning applications, public-sector pipeline notices, tenders, contract awards and commercial developments. If live evidence is present, distinguish owned/full results from teaser results. Never embellish teaser results with private project/contact fields or recommendations. For tenders mention deadlines and bid/no-bid urgency where evidence supports it. For contract awards, explain when approaching the awarded supplier/main contractor may create a subcontract opportunity. If workspace evidence is present, prioritise the strongest next actions rather than repeating metrics; inbound quote requests outrank cold opportunities. TwentyCI data is property context only and does not identify or grant permission to contact a homeowner. When there are more matches than returned, state the total and that you are showing the strongest subset. Use pounds sterling and UK terminology. Keep answers practical and short.`,
        },
        ...body.data.history.slice(-6).map((item) => ({ role: item.role, content: item.content } as const)),
        { role: "user", content: `QUESTION:\n${body.data.message}\n\nGROUNDING EVIDENCE:\n${JSON.stringify(evidence)}` },
      ],
    });

    const planningCards = opportunityResults.map((item) => ({ ...item, result_kind: "planning" as const }));
    const marketCards = marketResults.map((item) => ({
      result_kind: "market_signal" as const,
      opportunity_id: item.market_signal_trade_match_id,
      total_matches: item.total_matches,
      postcode_district: item.postcode_district ?? "",
      post_town: item.post_town,
      trade_name: item.trade_name,
      trade_slug: item.trade_slug,
      project_type: item.title,
      planning_status: item.signal_type,
      estimated_trade_value_low: item.estimated_trade_value_low,
      estimated_trade_value_high: item.estimated_trade_value_high,
      access_level: item.access_level,
      opportunity_score: item.fit_score,
      opportunity_bucket: null,
      summary: null,
      recommended_action: item.recommended_action,
      territory_status: item.access_level === "full" ? "owned" : "available",
      monthly_price_pence: 0,
      deadline_at: item.deadline_at,
      buyer_name: item.access_level === "full" ? item.buyer_name : null,
    }));

    const workspaceCards = planner.workspaceIntent === "priorities" && workspace
      ? workspace.portfolio.rankedOpportunities.slice(0, planner.limit).map((item) => ({
          result_kind: "planning" as const,
          opportunity_id: item.opportunityId,
          total_matches: workspace.portfolio.openOpportunities,
          postcode_district: item.postcodeDistrict,
          post_town: null,
          trade_name: item.tradeName,
          trade_slug: "",
          project_type: item.projectType,
          planning_status: item.planningStatus,
          estimated_trade_value_low: item.valueLow,
          estimated_trade_value_high: item.valueHigh,
          access_level: "full" as const,
          opportunity_score: item.score,
          opportunity_bucket: item.bucket,
          summary: null,
          recommended_action: item.recommendation,
          territory_status: "owned",
          monthly_price_pence: 0,
        }))
      : [];

    const cards = [...planningCards, ...marketCards].length ? [...planningCards, ...marketCards] : workspaceCards;
    return NextResponse.json({
      answer: response.output_text || "I couldn't produce a grounded answer from the available data.",
      opportunities: cards,
      totalMatches: planningTotal + marketTotal || cards.length,
      retrieval: {
        knowledgeHits: knowledge.length,
        livePlanningSearch: planner.needsOpportunitySearch,
        liveTradeIntelligenceSearch: planner.needsMarketSignalSearch,
        workspaceIntent: planner.workspaceIntent,
        currentOpportunity: Boolean(currentOpportunity),
      },
    });
  } catch (error) {
    console.error("Ask MyTradeBox failed", error);
    return NextResponse.json({ error: "assistant_failed" }, { status: 500 });
  }
}

function selectWorkspaceEvidence(workspace: Awaited<ReturnType<typeof getWorkspaceSnapshot>>, intent: z.infer<typeof workspaceIntentSchema>) {
  if (intent === "priorities") return { type: intent, portfolio: workspace.portfolio, inboundQuoteRequests: workspace.inboundQuoteRequests, marketOpportunities: workspace.marketOpportunities };
  if (intent === "coverage") return { type: intent, coverage: workspace.coverage, portfolio: workspace.portfolio, marketOpportunities: workspace.marketOpportunities };
  if (intent === "expansion") return { type: intent, coverage: workspace.coverage, nearbyExpansion: workspace.nearbyExpansion };
  if (intent === "roi") return { type: intent, portfolio: workspace.portfolio, marketOpportunities: workspace.marketOpportunities };
  if (intent === "followups") return { type: intent, followUps: workspace.followUps, inboundQuoteRequests: workspace.inboundQuoteRequests, rankedOpportunities: workspace.portfolio.rankedOpportunities.slice(0, 5) };
  return null;
}

async function planRetrieval(openai: NonNullable<ReturnType<typeof getAssistantOpenAI>>, message: string, history: { role: "user" | "assistant"; content: string }[]) {
  const response = await openai.responses.create({
    model: process.env.ASK_MYTRADEBOX_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content: `Return JSON only. Choose grounded retrieval sources. needsKnowledge=true for product/workflow/scoring/territory/notification/ROI/outreach/property/contactability questions. needsOpportunitySearch=true for planning applications or generic local opportunity searches unless the user explicitly asks only for tenders/procurement/public/commercial work. needsMarketSignalSearch=true for generic local opportunity searches and for tenders, council/local-authority work, public procurement, public pipeline, contract awards or commercial developments. For generic "show opportunities in X" use BOTH planning and market search. signalType=tender for tender/bid opportunities; public_pipeline for future/planned public work; contract_award for awarded work/main-contractor opportunities; commercial_development for private commercial builds; otherwise null. workspaceIntent=priorities for what to focus on/today's priorities/daily brief; coverage for owned territory; expansion for where to buy next; roi for actual pipeline/wins/spend/return; followups for reminders/chasing; otherwise none. Extract location and plain-language trade where supplied. Planning status uses submitted, validated, under_consideration, decision_expected, approved, rejected, withdrawn, appeal_lodged, unknown or null. Use limit 12 unless explicitly fewer, max 25.`,
      },
      ...history.slice(-4).map((item) => ({ role: item.role, content: item.content } as const)),
      { role: "user", content: message },
    ],
    text: { format: { type: "json_schema", name: "retrieval_plan", strict: true, schema: {
      type: "object", additionalProperties: false,
      properties: {
        needsKnowledge: { type: "boolean" },
        needsOpportunitySearch: { type: "boolean" },
        needsMarketSignalSearch: { type: "boolean" },
        workspaceIntent: { enum: ["none", "priorities", "coverage", "expansion", "roi", "followups"] },
        location: { anyOf: [{ type: "string" }, { type: "null" }] },
        trade: { anyOf: [{ type: "string" }, { type: "null" }] },
        status: { anyOf: [{ enum: ["submitted","validated","under_consideration","decision_expected","approved","rejected","withdrawn","appeal_lodged","unknown"] }, { type: "null" }] },
        signalType: { anyOf: [{ enum: ["tender","public_pipeline","contract_award","commercial_development"] }, { type: "null" }] },
        limit: { type: "integer", minimum: 1, maximum: 25 },
      },
      required: ["needsKnowledge","needsOpportunitySearch","needsMarketSignalSearch","workspaceIntent","location","trade","status","signalType","limit"],
    } } },
  });

  const parsed = plannerSchema.safeParse(JSON.parse(response.output_text || "{}"));
  return parsed.success ? parsed.data : {
    needsKnowledge: true,
    needsOpportunitySearch: false,
    needsMarketSignalSearch: false,
    workspaceIntent: "none" as const,
    location: null,
    trade: null,
    status: null,
    signalType: null,
    limit: 12,
  };
}
