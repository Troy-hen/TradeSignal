export type MarketplaceMarket = {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  examples: string[];
  providerLine: string;
  stage: "core" | "expanding";
};

/**
 * Product-facing market language. The catalog is deliberately separate from
 * the current planning/trade tables so the UI can move to the opportunity
 * graph without another navigation rewrite.
 */
export const MARKETPLACE_MARKETS: MarketplaceMarket[] = [
  {
    slug: "hospitality_openings",
    name: "Hospitality openings",
    eyebrow: "Openings & refits",
    description: "Find new venues, refurbishments and operators preparing to spend.",
    examples: ["New openings", "Refits", "Venue expansion"],
    providerLine: "Planning, business and location signals",
    stage: "expanding",
  },
  {
    slug: "moves_fitouts",
    name: "Moves & fit-outs",
    eyebrow: "Commercial property",
    description: "Spot businesses moving, expanding or getting ready for a new space.",
    examples: ["Office moves", "Fit-outs", "Commercial planning"],
    providerLine: "Planning and commercial development signals",
    stage: "core",
  },
  {
    slug: "care_health",
    name: "Care & health",
    eyebrow: "Care, clinics & health",
    description: "Surface expansion, compliance and facilities demand across care and health.",
    examples: ["Care homes", "Clinics", "Health estates"],
    providerLine: "Public registers and estate signals",
    stage: "expanding",
  },
  {
    slug: "commercial_energy",
    name: "Commercial energy",
    eyebrow: "Energy transition",
    description: "Find businesses with a reason to review energy, equipment or operating cost.",
    examples: ["Solar", "EV charging", "Efficiency"],
    providerLine: "Property, energy and business signals",
    stage: "expanding",
  },
  {
    slug: "growing_businesses",
    name: "Growing businesses",
    eyebrow: "Business change",
    description: "Prioritise companies showing the signals that usually precede a buying decision.",
    examples: ["Hiring", "Expansion", "New locations"],
    providerLine: "Companies House and vendor intelligence",
    stage: "expanding",
  },
  {
    slug: "public_contracts",
    name: "Public contracts",
    eyebrow: "Procurement & pipeline",
    description: "Bring tenders, pipeline notices and awards into the same commercial workspace.",
    examples: ["Tenders", "Pipeline", "Awards"],
    providerLine: "Find a Tender and Contracts Finder",
    stage: "core",
  },
];

export function getMarketplaceMarket(slug: string): MarketplaceMarket | undefined {
  return MARKETPLACE_MARKETS.find((market) => market.slug === slug);
}
