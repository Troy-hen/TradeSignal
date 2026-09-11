export type ProviderDataRights = {
  internalUseOnly: boolean;
  customerDisplayAllowed: boolean;
  customerExportAllowed: boolean;
  crmExportAllowed: boolean;
  cacheAllowed: boolean;
  retentionPeriodDays: number | null;
  attributionRequired: boolean;
  notes?: string | null;
};

export type ProviderSourceRecord = {
  providerKey: string;
  recordType: string;
  externalId: string;
  sourceUrl?: string | null;
  publishedAt?: string | null;
  retrievedAt: string;
  contentHash?: string | null;
  payload: Record<string, unknown>;
  rights: ProviderDataRights;
  isFixture: boolean;
};

export type NormalizedProviderRecord = ProviderSourceRecord & {
  entityObservation?: {
    name: string | null;
    legalName?: string | null;
    companiesHouseNumber?: string | null;
    website?: string | null;
    postcode?: string | null;
    resolutionMethod: string;
    resolutionConfidence: number;
  };
  eventObservations: Array<{
    eventType: string;
    occurredAt: string;
    factualData: Record<string, unknown>;
  }>;
  signalObservations: Array<{
    signalType: string;
    confidence: number;
    interpretation: Record<string, unknown>;
  }>;
};

export interface ProviderAdapter {
  readonly key: string;
  readonly displayName: string;
  readonly kind: "source" | "enrichment" | "geocoder";
  isConfigured(): boolean;
  fetch(request: { limit?: number; query?: string | null }): Promise<ProviderSourceRecord[]>;
  normalize(record: ProviderSourceRecord): Promise<NormalizedProviderRecord>;
}

export function defaultRights(isFixture = false): ProviderDataRights {
  return {
    internalUseOnly: !isFixture,
    customerDisplayAllowed: isFixture,
    customerExportAllowed: false,
    crmExportAllowed: false,
    cacheAllowed: isFixture,
    retentionPeriodDays: null,
    attributionRequired: !isFixture,
    notes: isFixture ? "Synthetic fixture data; never represent as production data." : "Confirm provider terms before customer display or export.",
  };
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
