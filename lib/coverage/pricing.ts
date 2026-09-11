/**
 * Customer-facing commercial model.
 *
 * The platform fee is determined only by geographic coverage. Opportunity
 * sources, supplier categories and relevance are part of the intelligence
 * engine rather than separately priced products.
 */
export const LEAD_UNLOCK_PRICE_PENCE = 2000;

export type CoveragePlanId = "local" | "regional" | "nationwide";
export type CoverageMode = "county" | "places" | "radius" | "nationwide";

export type CoveragePlan = {
  id: CoveragePlanId;
  name: string;
  monthlyPricePence: number;
  description: string;
  options: string[];
};

export const COVERAGE_PLANS: CoveragePlan[] = [
  {
    id: "local",
    name: "Local",
    monthlyPricePence: 2999,
    description: "A focused local footprint for the area you serve most often.",
    options: ["1 county", "Selected local towns or cities", "Up to a 25-mile radius"],
  },
  {
    id: "regional",
    name: "Regional",
    monthlyPricePence: 5999,
    description: "A broader regional footprint for teams covering a connected area.",
    options: ["Up to 3 neighbouring counties", "A larger town or city group", "Up to a 75-mile radius"],
  },
  {
    id: "nationwide",
    name: "Nationwide",
    monthlyPricePence: 9999,
    description: "Full United Kingdom coverage for businesses that sell nationally.",
    options: ["United Kingdom coverage", "All relevant opportunities nationwide", "One unified opportunity feed"],
  },
];

export const LEAD_UNLOCK_PRICE_GBP = "£20";

export function getCoveragePlan(planId: string): CoveragePlan | undefined {
  return COVERAGE_PLANS.find((plan) => plan.id === planId);
}

export function coveragePlanPricePence(planId: CoveragePlanId): number {
  const plan = getCoveragePlan(planId);
  if (!plan) throw new Error("Unknown coverage plan");
  return plan.monthlyPricePence;
}

export function formatMonthlyGbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}

/**
 * Legacy postcode helpers remain exported while the coverage reservation API
 * is migrated to the plan-based geography model. New UI must use
 * COVERAGE_PLANS instead of these helpers.
 */
export const CORE_POSTCODE_PRICE_PENCE = 2999;
export const COUNTY_DISCOUNT_PERCENT = 20;

const ADDITIONAL_POSTCODE_BANDS = [
  { through: 3, pricePence: 2499 },
  { through: 6, pricePence: 1999 },
  { through: 10, pricePence: 1499 },
  { through: Number.POSITIVE_INFINITY, pricePence: 999 },
] as const;

export type CoverageBillingMode = "custom" | "county";

export function postcodeUnitPricePence(position: number): number {
  if (!Number.isInteger(position) || position < 1) {
    throw new Error("position must be a positive integer");
  }
  if (position === 1) return CORE_POSTCODE_PRICE_PENCE;
  return ADDITIONAL_POSTCODE_BANDS.find((band) => position <= band.through)?.pricePence ?? 999;
}

export function coverageSubtotalPence(postcodeCount: number): number {
  if (!Number.isInteger(postcodeCount) || postcodeCount < 1 || postcodeCount > 500) {
    throw new Error("postcodeCount must be between 1 and 500");
  }
  return Array.from({ length: postcodeCount }, (_, index) => postcodeUnitPricePence(index + 1)).reduce(
    (total, price) => total + price,
    0,
  );
}

export function coveragePricePence(postcodeCount: number, billingMode: CoverageBillingMode = "custom"): number {
  const subtotal = coverageSubtotalPence(postcodeCount);
  if (billingMode === "county") {
    return Math.round((subtotal * (100 - COUNTY_DISCOUNT_PERCENT)) / 100);
  }
  return subtotal;
}

export function coveragePriceBreakdown(postcodeCount: number, billingMode: CoverageBillingMode = "custom") {
  const subtotal = coverageSubtotalPence(postcodeCount);
  const price = billingMode === "county" ? Math.round((subtotal * (100 - COUNTY_DISCOUNT_PERCENT)) / 100) : subtotal;
  return {
    subtotalPence: subtotal,
    discountPence: subtotal - price,
    monthlyPricePence: price,
    postcodeCount,
    billingMode,
  };
}
