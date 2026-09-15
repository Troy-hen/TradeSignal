export type MarketSignalType = "public_pipeline" | "tender" | "contract_award" | "commercial_development";

export type NormalizedMarketSignal = {
  source: string;
  sourceSignalId: string;
  signalType: MarketSignalType;
  title: string;
  summary?: string | null;
  locationText?: string | null;
  postcodeDistrict?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimatedProjectValueLow?: number | null;
  estimatedProjectValueHigh?: number | null;
  sourceUrl?: string | null;
  publishedAt?: string | null;
  sourceUpdatedAt?: string | null;
  contentHash?: string | null;
  procurementStage?: string | null;
  noticeType?: string | null;
  externalOcid?: string | null;
  buyerName?: string | null;
  buyerIdentifier?: string | null;
  supplierName?: string | null;
  deadlineAt?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  cpvCodes?: string[];
  deliveryPostcodes?: string[];
  deliveryRegions?: string[];
  contact?: Record<string, unknown>;
  valueCurrency?: string | null;
  locationConfidence?: "exact_postcode" | "delivery_region" | "buyer_address" | "unresolved";
  rawPayload?: Record<string, unknown>;
};

export interface MarketSignalProvider {
  readonly name: string;
  fetchSignals(input: {
    since?: string | null;
    limit?: number;
  }): Promise<NormalizedMarketSignal[]>;
}

/**
 * Public procurement can use several open sources at the same time. Paid
 * commercial-development sources will implement this same contract later,
 * after OEM/redistribution rights are agreed.
 */
export function configuredMarketSignalProviders(): string[] {
  const raw = Deno.env.get("MARKET_SIGNAL_PROVIDERS")?.trim();
  if (!raw) return ["find-a-tender", "contracts-finder"];
  if (raw.toLowerCase() === "none") return [];
  return Array.from(new Set(raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)));
}
