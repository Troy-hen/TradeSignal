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
      .select("provider, provider_application_id, source_url")
      .eq("id", context.planningApplicationId)
      .maybeSingle();

    if (!application || application.provider !== "plota" || !application.provider_application_id) return [];

    const url = new URL(`${PLOTA_BASE_URL}/applications/${encodeURIComponent(application.provider_application_id)}`);
    url.searchParams.set("include_contact", "true");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 403) throw new Error("Plota Contact Data is not enabled for this API key");
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Plota contact lookup failed with status ${response.status}`);

    const raw = (await response.json()) as unknown;
    const record = unwrapApplication(raw);
    if (!record) return [];
    const sourceUrl = record.links?.council ?? record.links?.plota ?? application.source_url ?? context.sourceUrl ?? "https://plota.co.uk";
    const results: ContactCandidate[] = [];

    // Applicant name can be returned as planning context, but never with
    // inferred consumer email/mobile data. The sales-facing lookup route only
    // persists candidates that actually contain professional contact details.
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

    // Plota also exposes council case-officer contact details where published.
    // MyTradeBox intentionally excludes those from the sales contact provider:
    // case officers are for planning administration, not prospecting.
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
