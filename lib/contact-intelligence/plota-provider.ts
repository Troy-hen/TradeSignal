import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ContactCandidate, ContactIntelligenceProvider, ContactLookupContext } from "./provider";

const PLOTA_BASE_URL = "https://api.plota.co.uk/v1";

type PlotaContactApplication = {
  id?: string;
  applicant?: string | null;
  agent?: string | null;
  agent_email?: string | null;
  agent_phone?: string | null;
  case_officer?: string | null;
  case_officer_email?: string | null;
  case_officer_phone?: string | null;
  authority?: { name?: string | null } | null;
  links?: { council?: string | null; plota?: string | null } | null;
  data?: unknown;
};

export class PlotaContactIntelligenceProvider implements ContactIntelligenceProvider {
  readonly name = "plota";

  constructor(private readonly apiKey: string) {}

  async lookup(context: ContactLookupContext): Promise<ContactCandidate[]> {
    const supabase = await createClient();
    const { data: application } = await supabase
      .from("planning_applications")
      .select("provider, provider_application_id, source_url, local_planning_authority")
      .eq("id", context.planningApplicationId)
      .maybeSingle();

    if (!application || application.provider !== "plota" || !application.provider_application_id) return [];

    const url = new URL(`${PLOTA_BASE_URL}/applications/${encodeURIComponent(application.provider_application_id)}`);
    url.searchParams.set("include_contact", "true");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 403) {
      throw new Error("Plota Contact Data is not enabled for this API key");
    }
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Plota contact lookup failed with status ${response.status}`);

    const raw = (await response.json()) as unknown;
    const record = unwrapApplication(raw);
    if (!record) return [];
    const sourceUrl = record.links?.council ?? record.links?.plota ?? application.source_url ?? context.sourceUrl ?? "https://plota.co.uk";
    const results: ContactCandidate[] = [];

    // Applicant names are useful context, but this adapter intentionally does
    // not attempt to discover or infer private homeowner email/mobile details.
    if (record.applicant) {
      results.push({
        entityType: "person",
        personName: record.applicant,
        sourceUrl,
        confidence: 1,
        lawfulBasis: "Published planning-register data; controller assessment required before direct marketing use.",
        purpose: "Identify the applicant named on the planning application. Do not use this record for consumer email/mobile enrichment.",
        raw: { provider: "plota", field: "applicant" },
      });
    }

    if (record.agent || record.agent_email || record.agent_phone) {
      results.push({
        entityType: "organisation",
        organisationName: record.agent ?? context.organisationName,
        email: record.agent_email ?? null,
        phone: record.agent_phone ?? null,
        sourceUrl,
        confidence: 1,
        lawfulBasis: "Published professional contact data from the planning register; controller assessment required.",
        purpose: "Contact the planning professional about the project or a relevant professional relationship.",
        raw: { provider: "plota", field: "agent" },
      });
    }

    if (record.case_officer || record.case_officer_email || record.case_officer_phone) {
      results.push({
        entityType: "person",
        personName: record.case_officer ?? null,
        organisationName: record.authority?.name ?? application.local_planning_authority ?? null,
        jobTitle: "Planning case officer",
        email: record.case_officer_email ?? null,
        phone: record.case_officer_phone ?? null,
        sourceUrl,
        confidence: 1,
        lawfulBasis: "Published council professional contact data from the planning register.",
        purpose: "Planning administration or factual application queries only; not a sales prospect.",
        raw: { provider: "plota", field: "case_officer" },
      });
    }

    return results;
  }
}

function unwrapApplication(value: unknown): PlotaContactApplication | null {
  let candidate = value;
  for (let i = 0; i < 3; i++) {
    if (!candidate || typeof candidate !== "object") return null;
    if (Array.isArray(candidate)) {
      candidate = candidate[0] ?? null;
      continue;
    }
    const object = candidate as PlotaContactApplication;
    if (object.id || object.applicant !== undefined || object.agent !== undefined) return object;
    if ("data" in object) {
      candidate = object.data;
      continue;
    }
    return null;
  }
  return null;
}
