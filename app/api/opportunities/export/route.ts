import { NextResponse } from "next/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities, type OpportunityActionFilter } from "@/lib/data/opportunities";
import type { Database } from "@/lib/types/database";

type OpportunityBucket = Database["public"]["Enums"]["opportunity_bucket"];
const VALID_BUCKETS = new Set<string>(["hot", "strong", "possible", "low"]);
const VALID_ACTIONS = new Set<string>(["new", "saved", "contacted", "quoted", "won", "lost"]);

export async function GET(request: Request) {
  const company = await requireCurrentCompany();
  const url = new URL(request.url);
  const bucketParam = url.searchParams.get("bucket") ?? "";
  const actionParam = url.searchParams.get("action") ?? "";
  const bucket = VALID_BUCKETS.has(bucketParam) ? (bucketParam as OpportunityBucket) : undefined;
  const action = VALID_ACTIONS.has(actionParam) ? (actionParam as OpportunityActionFilter) : undefined;

  const opportunities = await getCompanyOpportunities(company.id, { bucket, action, limit: 1000 });
  const supabase = await createClient();
  const opportunityIds = opportunities.map((item) => item.opportunityId);

  const applicationByOpportunity = new Map<
    string,
    { planning_reference: string; address_text: string | null; applicant_name: string | null; agent_company: string | null }
  >();

  if (opportunityIds.length > 0) {
    const { data: opportunityRows } = await supabase
      .from("application_trade_opportunities")
      .select("id, planning_application_id")
      .in("id", opportunityIds);
    const applicationIds = [...new Set((opportunityRows ?? []).map((row) => row.planning_application_id))];
    const { data: applicationRows } = applicationIds.length
      ? await supabase
          .from("planning_applications")
          .select("id, planning_reference, address_text, applicant_name, agent_company")
          .in("id", applicationIds)
      : { data: [] };
    const applicationById = new Map((applicationRows ?? []).map((row) => [row.id, row]));
    for (const row of opportunityRows ?? []) {
      const application = applicationById.get(row.planning_application_id);
      if (application) applicationByOpportunity.set(row.id, application);
    }
  }

  const headers = [
    "Postcode district",
    "Trade",
    "Project type",
    "Planning status",
    "Opportunity score",
    "Opportunity bucket",
    "Estimated trade value low",
    "Estimated trade value high",
    "Planning reference",
    "Address",
    "Applicant",
    "Planning agent / organisation",
    "Received date",
    "Decision date",
    "Lead stage",
    "Recommended action",
    "Recommended contact timing",
    "Likely start window",
    "AI confidence",
  ];

  const rows = opportunities.map((item) => {
    const application = applicationByOpportunity.get(item.opportunityId);
    return [
      item.district,
      item.tradeName,
      item.projectType ?? "",
      item.planningStatus,
      item.score ?? "",
      item.bucket ?? "",
      item.valueLow ?? "",
      item.valueHigh ?? "",
      application?.planning_reference ?? "",
      application?.address_text ?? "",
      application?.applicant_name ?? "",
      application?.agent_company ?? "",
      item.receivedDate ?? "",
      item.decisionDate ?? "",
      item.currentAction ?? "new",
      item.recommendedAction ?? "",
      item.recommendedContactTiming ?? "",
      item.likelyStartWindow ?? "",
      item.aiConfidence !== null ? Math.round(item.aiConfidence * 100) + "%" : "",
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const suffix = [bucketParam, actionParam].filter(Boolean).join("-");
  const filename = `mytradebox-opportunities${suffix ? "-" + suffix : ""}.csv`;

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}
