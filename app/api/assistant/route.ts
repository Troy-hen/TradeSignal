import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getAssistantOpenAI, resolveTradeSlug, retrieveKnowledge, searchOpportunityTeasers } from "@/lib/assistant/retrieval";
import { getWorkspaceSnapshot } from "@/lib/assistant/workspace-tools";
import { getCurrentOpportunityContext, opportunityIdFromContextPath } from "@/lib/assistant/opportunity-context";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).default([]),
  contextPath: z.string().max(500).nullable().optional(),
});

const workspaceIntentSchema = z.enum(["none", "priorities", "coverage", "expansion", "roi", "followups"]);
const plannerSchema = z.object({
  needsKnowledge: z.boolean(),
  needsOpportunitySearch: z.boolean(),
  workspaceIntent: workspaceIntentSchema,
  location: z.string().nullable(),
  trade: z.string().nullable(),
  status: z.enum(["submitted","validated","under_consideration","decision_expected","approved","rejected","withdrawn","appeal_lodged","unknown"]).nullable(),
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
    const [knowledge, opportunityResults, workspace, currentOpportunity] = await Promise.all([
      planner.needsKnowledge ? retrieveKnowledge(body.data.message, 6) : Promise.resolve([]),
      planner.needsOpportunitySearch && planner.location
        ? resolveTradeSlug(planner.trade).then((tradeSlug) => searchOpportunityTeasers({
            location: planner.location!, tradeSlug, status: planner.status, limit: planner.limit,
          }))
        : Promise.resolve([]),
      needsWorkspace ? getWorkspaceSnapshot(company.id) : Promise.resolve(null),
      currentOpportunityId ? getCurrentOpportunityContext(company.id, currentOpportunityId) : Promise.resolve(null),
    ]);

    const totalMatches = opportunityResults[0]?.total_matches ?? 0;
    const workspaceEvidence = workspace ? selectWorkspaceEvidence(workspace, planner.workspaceIntent) : null;
    const evidence = {
      knowledge: knowledge.map((item) => ({ title: item.document_title, category: item.category, content: item.content })),
      opportunitySearch: planner.needsOpportunitySearch ? {
        requestedLocation: planner.location,
        requestedTrade: planner.trade,
        requestedStatus: planner.status,
        totalMatches,
        returned: opportunityResults.length,
        results: opportunityResults,
      } : null,
      workspace: workspaceEvidence,
      currentOpportunity,
    };

    const response = await openai.responses.create({
      model: process.env.ASK_MYTRADEBOX_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "system",
          content: `You are Ask MyTradeBox, a concise commercial assistant for UK trade businesses. Answer only from the supplied evidence and ordinary non-sensitive reasoning. Never invent live MyTradeBox data. If live opportunity evidence is present, explicitly distinguish owned/full results from teaser results. Teaser results must never be embellished with addresses, planning references, applicant details, full summaries, AI reasoning or recommended actions. If workspace evidence is present, turn it into a decision: prioritise the strongest next actions instead of simply repeating metrics. If currentOpportunity evidence is present and the user refers to "this opportunity", "this property", "here" or similar, use that evidence as the current-page context. TwentyCI property intelligence is property-level context only: it does not identify the homeowner, prove construction intent, or grant permission to email/text an individual. A Likely To Sell percentile is movement context only. When there are more results than returned, say how many total matched and that you are showing the strongest subset. Use pounds sterling and UK terminology. Keep answers practical and short.`,
        },
        ...body.data.history.slice(-6).map((item) => ({ role: item.role, content: item.content } as const)),
        { role: "user", content: `QUESTION:\n${body.data.message}\n\nGROUNDING EVIDENCE:\n${JSON.stringify(evidence)}` },
      ],
    });

    const workspaceCards = planner.workspaceIntent === "priorities" && workspace
      ? workspace.portfolio.rankedOpportunities.slice(0, planner.limit).map((item) => ({
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

    return NextResponse.json({
      answer: response.output_text || "I couldn't produce a grounded answer from the available data.",
      opportunities: opportunityResults.length ? opportunityResults : workspaceCards,
      totalMatches: opportunityResults.length ? totalMatches : workspaceCards.length,
      retrieval: {
        knowledgeHits: knowledge.length,
        liveOpportunitySearch: planner.needsOpportunitySearch,
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
  if (intent === "priorities") return { type: intent, portfolio: workspace.portfolio };
  if (intent === "coverage") return { type: intent, coverage: workspace.coverage, portfolio: workspace.portfolio };
  if (intent === "expansion") return { type: intent, coverage: workspace.coverage, nearbyExpansion: workspace.nearbyExpansion };
  if (intent === "roi") return { type: intent, portfolio: workspace.portfolio };
  if (intent === "followups") return { type: intent, followUps: workspace.followUps, rankedOpportunities: workspace.portfolio.rankedOpportunities.slice(0, 5) };
  return null;
}

async function planRetrieval(
  openai: NonNullable<ReturnType<typeof getAssistantOpenAI>>,
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
) {
  const response = await openai.responses.create({
    model: process.env.ASK_MYTRADEBOX_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content: `Return JSON only. Decide which grounded retrieval sources are needed. needsKnowledge=true for questions about how MyTradeBox works, terminology, workflow, scoring, territories, notifications, ROI methodology, exports, outreach, property intelligence or contactability. needsOpportunitySearch=true when the user asks to find, show, count, compare, summarise or inspect market opportunities in a supplied place, trade or planning status. workspaceIntent=priorities when they ask what to focus on, best leads, top opportunities or today's priorities; coverage for questions about what they own; expansion for where they should buy/expand next; roi for their actual pipeline/wins/spend/return; followups for reminders or what needs chasing; otherwise none. Extract a UK location exactly as supplied where possible. Extract a plain-language trade if supplied. Status must be one of submitted, validated, under_consideration, decision_expected, approved, rejected, withdrawn, appeal_lodged, unknown or null. Use limit 12 unless explicitly fewer; never exceed 25.`,
      },
      ...history.slice(-4).map((item) => ({ role: item.role, content: item.content } as const)),
      { role: "user", content: message },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "retrieval_plan",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            needsKnowledge: { type: "boolean" },
            needsOpportunitySearch: { type: "boolean" },
            workspaceIntent: { enum: ["none", "priorities", "coverage", "expansion", "roi", "followups"] },
            location: { anyOf: [{ type: "string" }, { type: "null" }] },
            trade: { anyOf: [{ type: "string" }, { type: "null" }] },
            status: { anyOf: [{ enum: ["submitted","validated","under_consideration","decision_expected","approved","rejected","withdrawn","appeal_lodged","unknown"] }, { type: "null" }] },
            limit: { type: "integer", minimum: 1, maximum: 25 },
          },
          required: ["needsKnowledge","needsOpportunitySearch","workspaceIntent","location","trade","status","limit"],
        },
      },
    },
  });

  const parsed = plannerSchema.safeParse(JSON.parse(response.output_text || "{}"));
  return parsed.success
    ? parsed.data
    : { needsKnowledge: true, needsOpportunitySearch: false, workspaceIntent: "none" as const, location: null, trade: null, status: null, limit: 12 };
}
