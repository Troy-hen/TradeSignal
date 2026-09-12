import "server-only";
import { PlotaContactIntelligenceProvider } from "./plota-provider";

export type ContactLookupContext = {
  opportunityId: string;
  planningApplicationId: string;
  organisationName: string | null;
  applicantName: string | null;
  postcodeDistrict: string;
  sourceUrl: string | null;
};

export type ContactCandidate = {
  entityType: "person" | "organisation";
  personName?: string | null;
  organisationName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  sourceUrl: string;
  confidence?: number | null;
  lawfulBasis: string;
  purpose: string;
  expiresAt?: string | null;
  raw?: Record<string, unknown>;
};

export interface ContactIntelligenceProvider {
  readonly name: string;
  lookup(context: ContactLookupContext): Promise<ContactCandidate[]>;
}

/**
 * Contact intelligence is explicitly opt-in. Plota is the first provider
 * because it returns contacts published with the planning record itself.
 * Consumer email/mobile enrichment is intentionally out of scope.
 */
export function getContactIntelligenceProvider(): ContactIntelligenceProvider | null {
  const configured = process.env.CONTACT_INTELLIGENCE_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "none") return null;

  if (configured === "plota") {
    const apiKey = process.env.PLOTA_API_KEY;
    if (!apiKey) throw new Error("CONTACT_INTELLIGENCE_PROVIDER=plota requires PLOTA_API_KEY");
    return new PlotaContactIntelligenceProvider(apiKey);
  }

  throw new Error(`Unsupported CONTACT_INTELLIGENCE_PROVIDER: ${configured}`);
}
