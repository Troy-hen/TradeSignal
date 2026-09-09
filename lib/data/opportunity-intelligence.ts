import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OpportunityRelationshipIntelligence = {
  applicantName: string | null;
  agentCompany: string | null;
  organisation: {
    name: string;
    visibleProjects: number;
    approvedProjects: number;
    postcodeDistricts: number;
    estimatedTradeValueHigh: number;
  } | null;
  relatedOpportunities: Array<{
    opportunityId: string;
    postcodeDistrict: string;
    planningStatus: string;
    projectType: string | null;
    valueLow: number | null;
    valueHigh: number | null;
    receivedDate: string | null;
  }>;
};

/**
 * Builds relationship intelligence only from rows the signed-in user can
 * already see through RLS. That means the related-project signal becomes
 * richer as the customer expands coverage, without leaking addresses or
 * project detail from territories they do not own.
 */
export async function getOpportunityRelationshipIntelligence(input: {
  planningApplicationId: string;
  tradeCategoryId: string;
  applicantName: string | null;
  agentCompany: string | null;
}): Promise<OpportunityRelationshipIntelligence> {
  const supabase = await createClient();
  const organisationName = input.agentCompany?.trim() || null;

  if (!organisationName) {
    return {
      applicantName: input.applicantName,
      agentCompany: input.agentCompany,
      organisation: null,
      relatedOpportunities: [],
    };
  }

  const { data: applications } = await supabase
    .from("planning_applications")
    .select("id, postcode_district, status, received_date")
    .eq("agent_company", organisationName)
    .neq("id", input.planningApplicationId)
    .order("received_date", { ascending: false })
    .limit(40);

  const visibleApplications = applications ?? [];
  if (visibleApplications.length === 0) {
    return {
      applicantName: input.applicantName,
      agentCompany: input.agentCompany,
      organisation: {
        name: organisationName,
        visibleProjects: 1,
        approvedProjects: 0,
        postcodeDistricts: 1,
        estimatedTradeValueHigh: 0,
      },
      relatedOpportunities: [],
    };
  }

  const applicationIds = visibleApplications.map((row) => row.id);
  const [{ data: classifications }, { data: opportunities }] = await Promise.all([
    supabase
      .from("application_classifications")
      .select("id, planning_application_id, project_type")
      .in("planning_application_id", applicationIds),
    supabase
      .from("application_trade_opportunities")
      .select("id, planning_application_id, estimated_trade_value_low, estimated_trade_value_high")
      .eq("trade_category_id", input.tradeCategoryId)
      .in("planning_application_id", applicationIds)
      .eq("is_active", true),
  ]);

  const classificationByApplication = new Map(
    (classifications ?? []).map((row) => [row.planning_application_id, row]),
  );
  const opportunityByApplication = new Map(
    (opportunities ?? []).map((row) => [row.planning_application_id, row]),
  );

  const relatedOpportunities = visibleApplications
    .map((application) => {
      const opportunity = opportunityByApplication.get(application.id);
      if (!opportunity) return null;
      return {
        opportunityId: opportunity.id,
        postcodeDistrict: application.postcode_district ?? "—",
        planningStatus: application.status,
        projectType: classificationByApplication.get(application.id)?.project_type ?? null,
        valueLow: opportunity.estimated_trade_value_low,
        valueHigh: opportunity.estimated_trade_value_high,
        receivedDate: application.received_date,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .slice(0, 6);

  const estimatedTradeValueHigh = (opportunities ?? []).reduce(
    (sum, row) => sum + Number(row.estimated_trade_value_high ?? 0),
    0,
  );
  const postcodeDistricts = new Set(
    visibleApplications.map((row) => row.postcode_district).filter(Boolean),
  ).size;
  const approvedProjects = visibleApplications.filter((row) => row.status === "approved").length;

  return {
    applicantName: input.applicantName,
    agentCompany: input.agentCompany,
    organisation: {
      name: organisationName,
      visibleProjects: visibleApplications.length + 1,
      approvedProjects,
      postcodeDistricts: Math.max(1, postcodeDistricts),
      estimatedTradeValueHigh,
    },
    relatedOpportunities,
  };
}
