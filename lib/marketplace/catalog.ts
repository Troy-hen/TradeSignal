export type IntelligenceSource = {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  examples: string[];
  providerLine: string;
};

export type B2BTaxonomyGroup = {
  slug: string;
  name: string;
  description: string;
  examples: string[];
};

/**
 * Customer-facing summary of the breadth of supplier categories the engine
 * can match. These are examples, not separate plans or subscriptions.
 */
export const B2B_TAXONOMY_GROUPS: B2BTaxonomyGroup[] = [
  {
    slug: "digital-marketing",
    name: "Digital and marketing",
    description: "Digital presence, demand generation and brand work.",
    examples: ["Web design", "Ecommerce", "SEO", "Social media", "Content", "Branding", "PR"],
  },
  {
    slug: "software-technology",
    name: "Software, IT and communications",
    description: "Business systems, connectivity and technology change.",
    examples: ["CRM", "ERP", "EPOS", "Apps", "Cyber security", "Cloud", "AI", "VoIP"],
  },
  {
    slug: "professional-advisory",
    name: "Professional and advisory",
    description: "Specialist expertise that helps a business change, comply or grow.",
    examples: ["Accountancy", "Consulting", "Legal", "Insurance", "HR", "Recruitment", "Training"],
  },
  {
    slug: "finance-operations",
    name: "Finance and operations",
    description: "Financial control, back-office capacity and operational support.",
    examples: ["Bookkeeping", "Tax", "Payroll", "Finance", "Payments", "BPO", "Credit control"],
  },
  {
    slug: "premises-facilities",
    name: "Premises and facilities",
    description: "The people, products and systems needed to run a commercial site.",
    examples: ["Fit-out", "Office furniture", "Supplies", "Signage", "Cleaning", "Security", "HVAC"],
  },
  {
    slug: "utilities-infrastructure",
    name: "Utilities and infrastructure",
    description: "Energy, buildings, networks and physical infrastructure.",
    examples: ["Broadband", "Energy", "Solar", "EV charging", "Building controls", "Maintenance"],
  },
  {
    slug: "sector-supply-chain",
    name: "Sector and supply chain",
    description: "Specialist suppliers for hospitality, care, healthcare, retail, industry and logistics.",
    examples: ["Hospitality", "Healthcare", "Care", "Retail", "Manufacturing", "Logistics", "Packaging"],
  },
];

/**
 * Internal source layers shown for transparency. They are not products,
 * subscriptions or customer-selected verticals; every plan can be matched
 * against every enabled source.
 */
export const INTELLIGENCE_SOURCES: IntelligenceSource[] = [
  {
    slug: "hospitality_openings",
    name: "Business openings & refits",
    eyebrow: "Opening signals",
    description: "New venues, refurbishments and operators preparing to spend.",
    examples: ["New openings", "Refits", "Venue expansion"],
    providerLine: "Planning, business and location signals",
  },
  {
    slug: "moves_fitouts",
    name: "Moves & fit-outs",
    eyebrow: "Property change",
    description: "Businesses moving, expanding or getting ready for a new space.",
    examples: ["Office moves", "Fit-outs", "Commercial planning"],
    providerLine: "Planning and commercial development signals",
  },
  {
    slug: "care_health",
    name: "Care & health change",
    eyebrow: "Business change",
    description: "Expansion, compliance and facilities signals across care and health businesses.",
    examples: ["New facilities", "Clinics", "Health estates"],
    providerLine: "Public registers and estate signals",
  },
  {
    slug: "commercial_energy",
    name: "Commercial energy signals",
    eyebrow: "Property performance",
    description: "Businesses and properties with a credible reason to review energy or equipment.",
    examples: ["Solar", "EV charging", "Efficiency"],
    providerLine: "Property, energy and business signals",
  },
  {
    slug: "growing_businesses",
    name: "Growing businesses",
    eyebrow: "Company change",
    description: "Companies showing the signals that often precede a buying decision.",
    examples: ["Hiring", "Expansion", "New locations"],
    providerLine: "Companies House and vendor intelligence",
  },
  {
    slug: "public_contracts",
    name: "Public contracts",
    eyebrow: "Procurement signals",
    description: "Tenders, pipeline notices and awards brought into the same workspace.",
    examples: ["Tenders", "Pipeline", "Awards"],
    providerLine: "Find a Tender and Contracts Finder",
  },
];

// Compatibility alias for existing data components while the route names are
// migrated away from market-specific language.
export const MARKETPLACE_MARKETS = INTELLIGENCE_SOURCES;

export function getMarketplaceMarket(slug: string): IntelligenceSource | undefined {
  return INTELLIGENCE_SOURCES.find((source) => source.slug === slug);
}
