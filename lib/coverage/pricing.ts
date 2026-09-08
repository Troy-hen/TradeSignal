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
    return Math.round(subtotal * (100 - COUNTY_DISCOUNT_PERCENT) / 100);
  }
  return subtotal;
}

export function coveragePriceBreakdown(postcodeCount: number, billingMode: CoverageBillingMode = "custom") {
  const subtotal = coverageSubtotalPence(postcodeCount);
  const price = billingMode === "county" ? Math.round(subtotal * (100 - COUNTY_DISCOUNT_PERCENT) / 100) : subtotal;
  return {
    subtotalPence: subtotal,
    discountPence: subtotal - price,
    monthlyPricePence: price,
    postcodeCount,
    billingMode,
  };
}

export function formatMonthlyGbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}
