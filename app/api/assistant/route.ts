import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getAssistantOpenAI, resolveTradeSlug, retrieveKnowledge, searchOpportunityTeasers } from "@/lib/assistant/retrieval";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).default([]),
});

const plannerSchema = z.object({
  needsKnowledge: z.boolean(),
  needsOpportunitySearch: z.boolean(),
  location: z.string().nullable(),
  trade: z.string().nullable(),
  status: z.enum(["submitted","validated","under_consideration","decision_expected","approved","rejected","withdrawn","appeal_lodged","unknown"]).nullable(),
  limit: z.number().int().min(1).max(25).default(12),
});

export async function POST(request: Request) {
  await requireCurrentCompany();
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const openai = getAssistantOpenAI();
  if (!openai) return NextResponse.json({ error: "assistant_not_configured" }, { status: 503 });

  try {
    const planner = await planRetrieval(openai, body.data.message, body.data.history);
    const [knowledge, opportunityResults] = await Promise.all([
      planner.needsKnowledge ? retrieveKnowledge(body.data.message, 6) : Promise.resolve([]),
      planner.needsOpportunitySearch && planner.location
        ? resolveTradeSlug(planner.trade).then((tradeSlug) => searchOpportunityTeasers({
            location: planner.location!,
            tradeSlug,
            status: planner.status,
            limit: planner.limit,
          }))
        : Promise.resolve([]),
    ]);

    const totalMatches = opportunityResults[0]?.total_matches ?? 0;
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
    };

    const response = await openai.responses.create({
      model: process.env.ASK_MYTRADEBOX_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "system",
          content: `You are Ask MyTradeBox, a concise commercial assistant for UK trade businesses. Answer only from the supplied evidence and general non-sensitive reasoning. Never invent live MyTradeBox data. If live opportunity evidence is present, explicitly distinguish owned/full results from teaser results. Teaser results must never be embellished with addresses, planning references, applicant details, full summaries, AI reasoning or recommended actions. When there are more results than returned, say how many total matched and that you are showing the strongest subset. Use pounds sterling and UK terminology. Keep answers practical and short.`,
        },
        ...body.data.history.slice(-6).map((item) => ({ role: item.role, content: item.content } as const)),
        {
          role: "user",
          content: `QUESTION:\n${body.data.message}\n\nGROUNDING EVIDENCE:\n${JSON.stringify(evidence)}`,
        },
      ],
    });

    return NextResponse.json({
      answer: response.output_text || "I couldn't produce a grounded answer from the available data.",
      opportunities: opportunityResults,
      totalMatches,
      retrieval: { knowledgeHits: knowledge.length, liveOpportunitySearch: planner.needsOpportunitySearch },
    });
  } catch (error) {
    console.error("Ask MyTradeBox failed", error);
    return NextResponse.json({ error: "assistant_failed" }, { status: 500 });
  }
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
        content: `Return JSON only. Decide which retrieval sources are needed. needsKnowledge=true for questions about how MyTradeBox works, terminology, workflow, scoring, territories, notifications, ROI, exports or outreach. needsOpportunitySearch=true when the user asks to find, show, count, compare, summarise or inspect actual opportunities in a place, trade or planning status. Extract a UK location exactly as the user supplied it where possible, for example Norwich, NR2, Norfolk. Extract a plain-language trade if supplied. Status must be one of submitted, validated, under_consideration, decision_expected, approved, rejected, withdrawn, appeal_lodged, unknown or null. Use limit 12 unless the user explicitly requests fewer; never exceed 25.`,
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
            location: { anyOf: [{ type: "string" }, { type: "null" }] },
            trade: { anyOf: [{ type: "string" }, { type: "null" }] },
            status: { anyOf: [{ enum: ["submitted","validated","under_consideration","decision_expected","approved","rejected","withdrawn","appeal_lodged","unknown"] }, { type: "null" }] },
            limit: { type: "integer", minimum: 1, maximum: 25 },
          },
          required: ["needsKnowledge","needsOpportunitySearch","location","trade","status","limit"],
        },
      },
    },
  });

  const parsed = plannerSchema.safeParse(JSON.parse(response.output_text || "{}"));
  return parsed.success ? parsed.data : { needsKnowledge: true, needsOpportunitySearch: false, location: null, trade: null, status: null, limit: 12 };
}
