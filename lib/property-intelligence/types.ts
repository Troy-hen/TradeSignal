import "server-only";

export type PropertyActivitySignal = "strong" | "positive" | "neutral" | "caution";

export type PropertyTrigger = {
  type: string;
  date: string | null;
  price: number | null;
  tenure: string | null;
};

export type PropertyTransaction = {
  date: string | null;
  price: number | null;
};

export type PropertyIntelligenceSnapshot = {
  provider: string;
  uprn: string;
  matchMethod: "postcode_address";
  matchConfidence: number;
  matchedAddress: string | null;
  postcode: string | null;
  estimatedValueGbp: number | null;
  valueMinGbp: number | null;
  valueMaxGbp: number | null;
  avmConfidence: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garden: boolean | null;
  parking: boolean | null;
  latestTriggerType: string | null;
  latestTriggerDate: string | null;
  lastTransactionDate: string | null;
  lastTransactionPriceGbp: number | null;
  likelyToSellPercentile: number | null;
  activitySignal: PropertyActivitySignal;
  activityReasons: string[];
  triggerHistory: PropertyTrigger[];
  transactionHistory: PropertyTransaction[];
};

export interface PropertyIntelligenceProvider {
  readonly name: string;
  enrichProperty(input: { address: string; postcode: string }): Promise<PropertyIntelligenceSnapshot | null>;
}
