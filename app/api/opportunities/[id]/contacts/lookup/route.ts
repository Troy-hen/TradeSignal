import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveContactStrategy } from "@/lib/contact-intelligence/strategy";
import { getContactIntelligenceProvider } from "@/lib/contact-intelligence/provider";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const company = await requireCurrentCompany();
  const { id } = await params;
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("id,planning_application_id,postcode_district")
    .eq("id", id)
    .maybeSingle();
  if (!opportunity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: application } = await supabase
    .from("planning_applications")
    .select("id,applicant_name,agent_company,is_commercial,application_type,proposal_description,source_url")
    .eq("id", opportunity.planning_application_id)
    .maybeSingle();
  if (!application) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const strategy = deriveContactStrategy({
    applicantName: application.applicant_name,
    agentCompany: application.agent_company,
    isCommercial: application.is_commercial,
    applicationType: application.application_type,
    proposalDescription: application.proposal_description,
  });

  if (!strategy.preferPlanningContactData) {
    return NextResponse.json({ error: "planning_contact_not_recommended", contactType: strategy.type }, { status: 409 });
  }

  const provider = getContactIntelligenceProvider();
  if (!provider) return NextResponse.json({ error: "contact_provider_not_configured" }, { status: 503 });

  try {
    const candidates = await provider.lookup({
      opportunityId: id,
      planningApplicationId: application.id,
      organisationName: application.agent_company,
      applicantName: application.applicant_name,
      postcodeDistrict: opportunity.postcode_district,
      sourceUrl: application.source_url,
    });

    const professionalCandidates = candidates.filter((candidate) => {
      if (!candidate.email && !candidate.phone && !candidate.website) return false;
      if (candidate.entityType === "organisation") return true;
      return Boolean(candidate.jobTitle || candidate.organisationName);
    });

    if (professionalCandidates.length > 0) {
      await admin.from("contact_intelligence_records").insert(
        professionalCandidates.map((candidate) => ({
          company_id: company.id,
          opportunity_id: id,
          planning_application_id: application.id,
          provider: provider.name,
          entity_type: candidate.entityType,
          person_name: candidate.personName ?? null,
          organisation_name: candidate.organisationName ?? null,
          job_title: candidate.jobTitle ?? null,
          email: candidate.email ?? null,
          phone: candidate.phone ?? null,
          website: candidate.website ?? null,
          source_url: candidate.sourceUrl,
          confidence: candidate.confidence ?? null,
          lawful_basis: candidate.lawfulBasis,
          purpose: candidate.purpose,
          raw_payload: candidate.raw ?? {},
          expires_at: candidate.expiresAt ?? null,
          suppression_status: "active",
        })),
      );

      await db.from("opportunity_activity_events").insert({
        company_id: company.id,
        opportunity_id: id,
        event_type: "planning_contact_revealed",
        channel: "planning_professional",
        provider: provider.name,
        metadata: { contact_count: professionalCandidates.length },
        created_by: user.id,
      });
    }

    return NextResponse.json({
      provider: provider.name,
      contacts: professionalCandidates.map((candidate) => ({
        entityType: candidate.entityType,
        personName: candidate.personName ?? null,
        organisationName: candidate.organisationName ?? null,
        jobTitle: candidate.jobTitle ?? null,
        email: candidate.email ?? null,
        phone: candidate.phone ?? null,
        website: candidate.website ?? null,
        sourceUrl: candidate.sourceUrl,
        purpose: candidate.purpose,
      })),
      contactType: strategy.type,
    });
  } catch (error) {
    console.error("Planning contact lookup failed", error);
    return NextResponse.json({ error: "contact_lookup_failed" }, { status: 502 });
  }
}
