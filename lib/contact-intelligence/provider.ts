import "server-only";

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
 * External contact data stays provider-optional. The application already has
 * the persistence/provenance model, but no provider is silently enabled. Add
 * a concrete adapter here only after its UK coverage, provenance, DPA/GDPR
 * terms and lookup economics have been reviewed.
 */
export function getContactIntelligenceProvider(): ContactIntelligenceProvider | null {
  const configured = process.env.CONTACT_INTELLIGENCE_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "none") return null;
  throw new Error(`Unsupported CONTACT_INTELLIGENCE_PROVIDER: ${configured}`);
}
