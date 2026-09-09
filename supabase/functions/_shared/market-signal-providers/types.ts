export type NormalizedMarketSignal = {
  source: string;
  sourceSignalId: string;
  signalType: string;
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
  contentHash?: string | null;
  rawPayload?: Record<string, unknown>;
};

export interface MarketSignalProvider {
  readonly name: string;
  fetchSignals(input: {
    since?: string | null;
    postcodeDistricts?: string[];
    limit?: number;
  }): Promise<NormalizedMarketSignal[]>;
}

/**
 * Early Signals intentionally has no default provider. A source becomes part
 * of MyTradeBox only after we can prove that it adds actionable trade work,
 * not merely more construction data.
 */
export function getMarketSignalProvider(): MarketSignalProvider {
  const provider = Deno.env.get("MARKET_SIGNAL_PROVIDER")?.trim().toLowerCase();
  if (!provider || provider === "none") throw new Error("MARKET_SIGNAL_PROVIDER is not configured");
  throw new Error(`Unsupported MARKET_SIGNAL_PROVIDER: ${provider}`);
}
