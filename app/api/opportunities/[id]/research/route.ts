import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getAssistantOpenAI, retrieveKnowledge } from "@/lib/assistant/retrieval";
import { getOpportunityRelationshipIntelligence } from "@/lib/data/opportunity-intelligence";
import { getStoredPropertyIntelligence } from "@/lib/data/property-intelligence";
import { getCompaniesHouseCompanySummary } from "@/lib/company-intelligence/companies-house";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;

  const { data } = await db
    .from("opportunity_research_reports")
    .select("id,status,summary,report,sources,generated_at,expires_at,error_message")
    .eq("company_id", company.id)
    .eq("opportunity_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ report: data ?? null });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!opportunity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [{ data: application }, { data: classification }, { data: trade }] = await Promise.all([
    supabase.from("planning_applications").select("*").eq("id", opportunity.planning_application_id).maybeSingle(),
    supabase.from("application_classifications").select("*").eq("id", opportunity.application_classification_id).maybeSingle(),
    supabase.from("trade_categories").select("id,name,slug").eq("id", opportunity.trade_category_id).maybeSingle(),
  ]);
  if (!application || !classification || !trade) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const openai = getAssistantOpenAI();
  if (!openai) return NextResponse.json({ error: "assistant_not_configured" }, { status: 503 });

  const relationship = await getOpportunityRelationshipIntelligence({
    planningApplicationId: application.id,
    tradeCategoryId: opportunity.trade_category_id,
    applicantName: application.applicant_name,
    agentCompany: application.agent_company,
  });

  const corporateName = relationship.contactStrategy.allowBusinessEnrichment
    ? relationship.agentCompany ?? relationship.applicantName
    : null;

  const [knowledge, companyIntelligence, propertyIntelligence] = await Promise.all([
    retrieveKnowledge(
      `${trade.name} planning opportunity ${classification.project_type ?? "project"} commercial approach timing`,
      4,
    ),
    getCompaniesHouseCompanySummary(corporateName).catch((error) => {
      console.warn("Companies House enrichment unavailable", error);
      return null;
    }),
    getStoredPropertyIntelligence(company.id, id),
  ]);

  const { data: reportRow, error: insertError } = await db
    .from("opportunity_research_reports")
    .insert({
      company_id: company.id,
      opportunity_id: id,
      status: "running",
      generated_by: user.id,
      model: process.env.ASK_MYTRADEBOX_MODEL ?? "gpt-5-mini",
    })
    .select("id")
    .single();
  if (insertError || !reportRow) return NextResponse.json({ error: "research_create_failed" }, { status: 500 });

  const evidence = {
    project: {
      trade: trade.name,
      projectType: classification.project_type,
      summary: classification.summary,
      planningStatus: application.status,
      proposal: application.proposal_description,
      postcodeDistrict: application.postcode_district,
      localPlanningAuthority: application.local_planning_authority,
      receivedDate: application.received_date,
      decisionDate: application.decision_date,
      likelyStart: classification.likely_start_window,
      estimatedTradeValueLow: opportunity.estimated_trade_value_low,
      estimatedTradeValueHigh: opportunity.estimated_trade_value_high,
      matchReasons: opportunity.match_reasons,
      likelyScope: opportunity.likely_scope,
      currentRecommendation: opportunity.recommended_action,
      contactTiming: opportunity.recommended_contact_timing,
      riskFlags: opportunity.risk_flags,
    },
    relationship,
    propertyIntelligence,
    companyIntelligence,
    knowledge: knowledge.map((item) => ({ title: item.document_title, content: item.content })),
    sourcePlanningUrl: application.source_url,
  };

  try {
    const response = await createResearchResponse(openai, evidence);
    const parsed = parseResearch(response.output_text);
    const sources = collectWebSources(response, application.source_url);
    if (companyIntelligence?.sourceUrl && !sources.some((source) => source.url === companyIntelligence.sourceUrl)) {
      sources.push({ title: "Companies House company record", url: companyIntelligence.sourceUrl });
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: completed, error: updateError } = await db
      .from("opportunity_research_reports")
      .update({
        status: "completed",
        summary: parsed.executiveSummary,
        report: parsed,
        sources: sources.slice(0, 12),
        generated_at: now.toISOString(),
        expires_at: expiresAt,
        updated_at: now.toISOString(),
        error_message: null,
      })
      .eq("id", reportRow.id)
      .eq("company_id", company.id)
      .select("id,status,summary,report,sources,generated_at,expires_at")
      .single();
    if (updateError) throw updateError;

    await db.from("opportunity_activity_events").insert({
      company_id: company.id,
      opportunity_id: id,
      event_type: "researched",
      channel: "assistant",
      metadata: {
        research_report_id: reportRow.id,
        source_count: sources.length,
        companies_house: Boolean(companyIntelligence),
        property_intelligence: Boolean(propertyIntelligence),
      },
      created_by: user.id,
    });

    return NextResponse.json({ report: completed });
  } catch (error) {
    console.error("Opportunity research failed", error);
    await db
      .from("opportunity_research_reports")
      .update({ status: "failed", error_message: "Research generation failed.", updated_at: new Date().toISOString() })
      .eq("id", reportRow.id)
      .eq("company_id", company.id);
    return NextResponse.json({ error: "research_failed" }, { status: 502 });
  }
}

async function createResearchResponse(openai: NonNullable<ReturnType<typeof getAssistantOpenAI>>, evidence: unknown) {
  const common = {
    model: process.env.ASK_MYTRADEBOX_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system" as const,
        content: `You are MyTradeBox commercial research. Produce a grounded sales-research brief for a UK trade business. Use the supplied MyTradeBox evidence as authoritative. Public web research may supplement organisation/project context, but never invent facts or personal contact details. Follow the supplied contactStrategy: do not recommend consumer email/mobile enrichment for homeowner-led opportunities. Companies House officers are registry context, not automatically sales contacts. TwentyCI propertyIntelligence is property-level timing and market context only: it does not prove who lives at the property, create permission to contact an individual electronically, or prove construction intent. A Likely To Sell score is movement context, not evidence that planned works will proceed. Use property recency only when it genuinely changes timing or prioritisation. Focus on what changes the user's next action. Return JSON only with executiveSummary, commercialAssessment, whoToApproach, timing, relationshipSignal, risks, nextActions, externalFindings. Each array must contain short strings. If public research finds nothing useful, say so in externalFindings.`,
      },
      { role: "user" as const, content: JSON.stringify(evidence) },
    ],
    text: {
      format: {
        type: "json_schema" as const,
        name: "opportunity_research",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            executiveSummary: { type: "string" },
            commercialAssessment: { type: "string" },
            whoToApproach: { type: "string" },
            timing: { type: "string" },
            relationshipSignal: { type: "string" },
            risks: { type: "array", items: { type: "string" } },
            nextActions: { type: "array", items: { type: "string" } },
            externalFindings: { type: "array", items: { type: "string" } },
          },
          required: ["executiveSummary","commercialAssessment","whoToApproach","timing","relationshipSignal","risks","nextActions","externalFindings"],
        },
      },
    },
  };

  try {
    return await openai.responses.create({
      ...common,
      tools: [{ type: "web_search_preview" }],
      include: ["web_search_call.action.sources"],
    });
  } catch (error) {
    console.warn("Web-backed research unavailable; retrying with internal evidence only", error);
    return openai.responses.create(common);
  }
}

function parseResearch(value: string) {
  const parsed = JSON.parse(value || "{}");
  return {
    executiveSummary: String(parsed.executiveSummary ?? "Research completed."),
    commercialAssessment: String(parsed.commercialAssessment ?? ""),
    whoToApproach: String(parsed.whoToApproach ?? ""),
    timing: String(parsed.timing ?? ""),
    relationshipSignal: String(parsed.relationshipSignal ?? ""),
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String).slice(0, 8) : [],
    nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.map(String).slice(0, 8) : [],
    externalFindings: Array.isArray(parsed.externalFindings) ? parsed.externalFindings.map(String).slice(0, 8) : [],
  };
}

function collectWebSources(response: unknown, planningUrl: string | null) {
  const found = new Map<string, { title: string; url: string }>();
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string" && /^https?:\/\//.test(obj.url)) {
      found.set(obj.url, { title: typeof obj.title === "string" ? obj.title : new URL(obj.url).hostname, url: obj.url });
    }
    for (const child of Object.values(obj)) {
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === "object") walk(child);
    }
  };
  walk(response);
  if (planningUrl) found.set(planningUrl, { title: "Planning source record", url: planningUrl });
  return [...found.values()].slice(0, 12);
}
