import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { deriveContactStrategy, type ContactStrategy } from "@/lib/contact-intelligence/strategy";

export type OpportunityRelationshipIntelligence = {
  applicantName: string | null;
  agentCompany: string | null;
  projectAddress: string | null;
  contactStrategy: ContactStrategy;
  planningContacts: Array<{
    id: string;
    provider: string;
    entityType: string;
    personName: string | null;
    organisationName: string | null;
    jobTitle: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    sourceUrl: string | null;
    purpose: string | null;
    retrievedAt: string;
  }>;
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
  const db = supabase as unknown as SupabaseClient;
  const organisationName = input.agentCompany?.trim() || null;

  const [{ data: currentApplication }, { data: contactRows }] = await Promise.all([
    supabase
      .from("planning_applications")
      .select("address_text, is_commercial, application_type, proposal_description")
      .eq("id", input.planningApplicationId)
      .maybeSingle(),
    db
      .from("contact_intelligence_records")
      .select("id,provider,entity_type,person_name,organisation_name,job_title,email,phone,website,source_url,purpose,retrieved_at")
      .eq("planning_application_id", input.planningApplicationId)
      .eq("suppression_status", "active")
      .order("retrieved_at", { ascending: false })
      .limit(12),
  ]);

  const contactStrategy = deriveContactStrategy({
    applicantName: input.applicantName,
    agentCompany: input.agentCompany,
    isCommercial: currentApplication?.is_commercial ?? null,
    applicationType: currentApplication?.application_type ?? null,
    proposalDescription: currentApplication?.proposal_description ?? null,
  });

  const planningContacts = (contactRows ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    provider: String(row.provider),
    entityType: String(row.entity_type),
    personName: typeof row.person_name === "string" ? row.person_name : null,
    organisationName: typeof row.organisation_name === "string" ? row.organisation_name : null,
    jobTitle: typeof row.job_title === "string" ? row.job_title : null,
    email: typeof row.email === "string" ? row.email : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    website: typeof row.website === "string" ? row.website : null,
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    purpose: typeof row.purpose === "string" ? row.purpose : null,
    retrievedAt: String(row.retrieved_at),
  }));

  const base = {
    applicantName: input.applicantName,
    agentCompany: input.agentCompany,
    projectAddress: currentApplication?.address_text ?? null,
    contactStrategy,
    planningContacts,
  };

  if (!organisationName) {
    return {
      ...base,
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
      ...base,
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
    ...base,
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
