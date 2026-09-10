import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAssistantOpenAI } from "@/lib/assistant/retrieval";
import { getWorkspaceSnapshot } from "@/lib/assistant/workspace-tools";

const briefSchema = z.object({
  headline: z.string().max(120),
  summary: z.string().max(1200),
  priorities: z.array(z.object({
    targetKey: z.string(),
    title: z.string().max(160),
    reason: z.string().max(500),
    draftType: z.enum(["none", "letter", "email"]),
    draftSubject: z.string().max(180).nullable(),
    draftBody: z.string().max(3000).nullable(),
  })).max(5),
});

type StoredBrief = {
  id: string;
  brief_date: string;
  summary: string;
  snapshot: Record<string, unknown>;
  action_items: unknown[];
  model: string | null;
  generated_at: string;
};

type Target = { key: string; href: string; kind: string; title: string };

export async function GET() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const existing = await db
    .from("assistant_daily_briefs")
    .select("id,brief_date,summary,snapshot,action_items,model,generated_at")
    .eq("company_id", company.id)
    .eq("brief_date", today)
    .maybeSingle();
  if (existing.data) return NextResponse.json(toResponse(existing.data as unknown as StoredBrief, false));

  const openai = getAssistantOpenAI();
  if (!openai) return NextResponse.json({ error: "assistant_not_configured" }, { status: 503 });

  try {
    const workspace = await getWorkspaceSnapshot(company.id);
    const { data: benchmarks } = await db.rpc("get_conversion_learning_benchmarks", { p_min_platform_sample: 10 });
    const evidence = buildEvidence(workspace, Array.isArray(benchmarks) ? benchmarks : []);
    const targets = buildTargets(workspace);

    const model = process.env.ASK_MYTRADEBOX_MODEL ?? "gpt-5-mini";
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: `You are the MyTradeBox Daily Brief. Turn the supplied, permission-safe workspace evidence into a concise morning commercial briefing for a UK trade business. The hierarchy is strict: (1) unanswered inbound quote requests, (2) deadlines/follow-ups requiring action, (3) the strongest new or high-value opportunities, (4) expansion/other context. Do not invent facts, people, addresses, values, conversion rates or live records. Return no more than five priorities. Every priority MUST use a targetKey supplied in AVAILABLE TARGETS. For a cold planning opportunity you may prepare a short professional homeowner/project-address letter draft. For a tender, public pipeline, contract award or commercial-development opportunity you may prepare a short professional B2B email draft. A draft is for human approval only and must never imply it has been sent. Do not draft unsolicited consumer email. Quote-request priorities use draftType=none. If measured conversion benchmarks exist you may use them cautiously and quote the sample size; never claim causation.`,
        },
        {
          role: "user",
          content: `COMPANY: ${company.trading_name}\n\nWORKSPACE EVIDENCE:\n${JSON.stringify(evidence)}\n\nAVAILABLE TARGETS:\n${JSON.stringify(targets)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "daily_brief",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              headline: { type: "string" },
              summary: { type: "string" },
              priorities: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    targetKey: { type: "string" },
                    title: { type: "string" },
                    reason: { type: "string" },
                    draftType: { enum: ["none", "letter", "email"] },
                    draftSubject: { anyOf: [{ type: "string" }, { type: "null" }] },
                    draftBody: { anyOf: [{ type: "string" }, { type: "null" }] },
                  },
                  required: ["targetKey", "title", "reason", "draftType", "draftSubject", "draftBody"],
                },
              },
            },
            required: ["headline", "summary", "priorities"],
          },
        },
      },
    });

    const parsed = briefSchema.safeParse(JSON.parse(response.output_text || "{}"));
    if (!parsed.success) throw new Error("Daily brief returned invalid structured output");

    const allowedTargets = new Map(targets.map((target) => [target.key, target]));
    const priorities = parsed.data.priorities
      .filter((item) => allowedTargets.has(item.targetKey))
      .map((item) => ({ ...item, ...allowedTargets.get(item.targetKey)!, requiresApproval: item.draftType !== "none" }));
    const snapshot = {
      headline: parsed.data.headline,
      generatedFrom: evidence.metrics,
      benchmarkRows: evidence.conversionBenchmarks.length,
    };

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: stored, error } = await admin
      .from("assistant_daily_briefs")
      .upsert({
        company_id: company.id,
        brief_date: today,
        snapshot,
        summary: parsed.data.summary,
        action_items: priorities,
        model,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,brief_date" })
      .select("id,brief_date,summary,snapshot,action_items,model,generated_at")
      .single();
    if (error || !stored) throw new Error(error?.message ?? "Could not store daily brief");
    return NextResponse.json(toResponse(stored as unknown as StoredBrief, true));
  } catch (error) {
    console.error("Daily brief generation failed", error);
    return NextResponse.json({ error: "daily_brief_failed" }, { status: 500 });
  }
}

function buildEvidence(workspace: Awaited<ReturnType<typeof getWorkspaceSnapshot>>, benchmarks: unknown[]) {
  return {
    metrics: {
      totalOpportunities: workspace.portfolio.totalOpportunities,
      openOpportunities: workspace.portfolio.openOpportunities,
      planningOpportunities: workspace.portfolio.planningOpportunities,
      publicCommercialOpportunities: workspace.portfolio.marketOpportunities,
      pipelineValue: workspace.portfolio.pipelineValue,
      quotedValue: workspace.portfolio.quotedValue,
      wonValue: workspace.portfolio.wonValue,
      inboundQuoteRequests: workspace.inboundQuoteRequests.length,
      pendingFollowUps: workspace.followUps.length,
    },
    inboundQuoteRequests: workspace.inboundQuoteRequests.slice(0, 8),
    followUps: workspace.followUps.slice(0, 8),
    strongestPlanning: workspace.portfolio.rankedOpportunities.slice(0, 8),
    strongestPublicCommercial: workspace.marketOpportunities.slice(0, 8),
    conversionBenchmarks: benchmarks.slice(0, 12),
  };
}

function buildTargets(workspace: Awaited<ReturnType<typeof getWorkspaceSnapshot>>): Target[] {
  const targets: Target[] = [];
  for (const request of workspace.inboundQuoteRequests.slice(0, 8)) {
    if (request.opportunityId) targets.push({ key: `quote:${request.id}`, href: `/opportunities/${request.opportunityId}`, kind: "quote_request", title: `Quote request from ${request.name}` });
    else if (request.marketSignalTradeMatchId) targets.push({ key: `quote:${request.id}`, href: `/opportunities/trade/${request.marketSignalTradeMatchId}`, kind: "quote_request", title: `Quote request from ${request.name}` });
  }
  for (const item of workspace.portfolio.rankedOpportunities.slice(0, 8)) {
    targets.push({ key: `planning:${item.opportunityId}`, href: `/opportunities/${item.opportunityId}`, kind: "planning", title: `${item.projectType ?? "Planning opportunity"} · ${item.postcodeDistrict}` });
  }
  for (const item of workspace.marketOpportunities.slice(0, 8)) {
    targets.push({ key: `market:${item.matchId}`, href: `/opportunities/trade/${item.matchId}`, kind: item.signalType, title: item.title });
  }
  for (const followUp of workspace.followUps.slice(0, 8)) {
    if (followUp.opportunityId) targets.push({ key: `followup:${followUp.id}`, href: `/opportunities/${followUp.opportunityId}`, kind: "follow_up", title: followUp.projectType ?? "Follow-up due" });
  }
  return targets;
}

function toResponse(row: StoredBrief, generated: boolean) {
  return {
    id: row.id,
    date: row.brief_date,
    headline: typeof row.snapshot?.headline === "string" ? row.snapshot.headline : "Your MyTradeBox brief",
    summary: row.summary,
    priorities: Array.isArray(row.action_items) ? row.action_items : [],
    generatedAt: row.generated_at,
    generated,
  };
}
