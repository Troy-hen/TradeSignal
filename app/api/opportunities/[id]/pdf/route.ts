import { NextResponse } from "next/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { renderSimplePdf } from "@/lib/export/simple-pdf";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireCurrentCompany();
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!opportunity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [{ data: application }, { data: classification }, { data: trade }] = await Promise.all([
    supabase.from("planning_applications").select("*").eq("id", opportunity.planning_application_id).maybeSingle(),
    supabase.from("application_classifications").select("*").eq("id", opportunity.application_classification_id).maybeSingle(),
    supabase.from("trade_categories").select("name").eq("id", opportunity.trade_category_id).maybeSingle(),
  ]);

  if (!application || !classification) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const sections = [
    {
      heading: "Opportunity summary",
      lines: [
        `District: ${application.postcode_district ?? opportunity.postcode_district}`,
        `Trade: ${trade?.name ?? "Trade"}`,
        `Project: ${classification.project_type ?? "Planning application"}`,
        `Planning status: ${humanize(application.status)}`,
        `Opportunity score: ${opportunity.opportunity_score ?? "-"}/100 (${humanize(opportunity.opportunity_bucket ?? "unscored")})`,
        classification.summary ?? "No summary recorded.",
      ],
    },
    {
      heading: "Commercial signal",
      lines: [
        `Estimated total project value: ${formatRange(classification.estimated_total_project_value_low, classification.estimated_total_project_value_high)}`,
        `Estimated trade value: ${formatRange(opportunity.estimated_trade_value_low, opportunity.estimated_trade_value_high)}`,
        `Likely start: ${classification.likely_start_window ?? "Not specified"}`,
        `AI confidence: ${opportunity.ai_confidence !== null ? Math.round(opportunity.ai_confidence * 100) + "%" : "Not available"}`,
      ],
    },
    {
      heading: "Why this matched",
      lines: opportunity.match_reasons?.length ? opportunity.match_reasons.map((value: string) => `- ${value}`) : ["No reasoning recorded."],
    },
    {
      heading: "Likely scope",
      lines: opportunity.likely_scope?.length ? opportunity.likely_scope.map((value: string) => `- ${value}`) : ["Not specified."],
    },
    {
      heading: "Recommended approach",
      lines: [
        opportunity.recommended_action ?? "No recommendation recorded.",
        opportunity.recommended_contact_timing ? `Timing: ${opportunity.recommended_contact_timing}` : "",
        opportunity.risk_flags?.length ? `Risk flags: ${opportunity.risk_flags.join(", ")}` : "",
      ].filter(Boolean),
    },
    {
      heading: "Planning record",
      lines: [
        `Address: ${application.address_text ?? "Not available"}`,
        `Planning reference: ${application.planning_reference}`,
        `Authority: ${application.local_planning_authority ?? "Unknown"}`,
        `Application type: ${application.application_type ?? "Unknown"}`,
        `Received: ${application.received_date ?? "Unknown"}`,
        `Decision due: ${application.decision_due_date ?? "Not available"}`,
        `Applicant: ${application.applicant_name ?? "Not supplied"}`,
        `Planning agent / organisation: ${application.agent_company ?? "Not supplied"}`,
        application.proposal_description ? `Proposal: ${application.proposal_description}` : "",
      ].filter(Boolean),
    },
  ];

  const pdf = renderSimplePdf({
    title: "MyTradeBox Opportunity Brief",
    subtitle: `${application.postcode_district ?? opportunity.postcode_district} · ${trade?.name ?? "Trade"} · generated ${new Date().toLocaleDateString("en-GB")}`,
    sections,
  });

  const safeDistrict = String(application.postcode_district ?? opportunity.postcode_district ?? "opportunity").replace(/[^a-z0-9-]/gi, "-");
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mytradebox-${safeDistrict}-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function formatRange(low: number | null, high: number | null) {
  const formatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  if (low === null && high === null) return "Not available";
  if (low !== null && high !== null) return `${formatter.format(low)}-${formatter.format(high)}`;
  return formatter.format(high ?? low ?? 0);
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
