import type { NormalizedMarketSignal } from "./types.ts";

export type TradeCategory = { id: string; name: string; slug: string };
export type TradeSignalMatch = {
  tradeCategoryId: string;
  fitScore: number;
  opportunityBucket: "hot" | "strong" | "possible" | "low";
  estimatedTradeValueLow: number | null;
  estimatedTradeValueHigh: number | null;
  recommendedAction: string;
  matchReasons: string[];
  matchMethod: "rules";
};

type TradeRule = {
  keywords: string[];
  strongKeywords?: string[];
  cpvPrefixes?: string[];
  broadShare: [number, number];
  directShare?: [number, number];
};

const RULES: Record<string, TradeRule> = {
  roofing: {
    keywords: ["roof", "roofing", "re-roof", "reroof", "gutter", "rainwater goods", "rooflight", "flat roof", "pitched roof"],
    strongKeywords: ["roof replacement", "roof renewal", "re-roofing", "reroofing", "flat roof renewal", "roof covering"],
    cpvPrefixes: ["45261", "452612", "452613", "452614", "452619"], broadShare: [0.04, 0.10], directShare: [0.65, 1.0],
  },
  electrical: {
    keywords: ["electrical", "rewire", "rewiring", "lighting", "fire alarm", "power distribution", "switchgear", "ev charger", "ev charging"],
    strongKeywords: ["electrical installation", "electrical works", "rewiring", "lighting replacement"],
    cpvPrefixes: ["4531", "3168", "315"], broadShare: [0.07, 0.14], directShare: [0.55, 1.0],
  },
  "plumbing-heating": {
    keywords: ["plumbing", "heating", "boiler", "mechanical services", "hvac", "hot water", "heat network", "radiator", "bathroom", "sanitary"],
    strongKeywords: ["boiler replacement", "heating replacement", "plumbing works", "mechanical installation"],
    cpvPrefixes: ["4533", "45331", "45332"], broadShare: [0.08, 0.16], directShare: [0.55, 1.0],
  },
  renewables: {
    keywords: ["solar", "photovoltaic", "pv", "heat pump", "renewable", "battery storage", "decarbonisation", "low carbon", "retrofit"],
    strongKeywords: ["solar pv", "photovoltaic installation", "heat pump installation", "battery storage"],
    cpvPrefixes: ["0933", "425111", "45261215"], broadShare: [0.05, 0.15], directShare: [0.55, 1.0],
  },
  "windows-doors": {
    keywords: ["window", "windows", "door", "doors", "glazing", "fenestration", "curtain wall"],
    strongKeywords: ["window replacement", "door replacement", "replacement windows", "replacement doors", "glazing works"],
    cpvPrefixes: ["45421", "44221"], broadShare: [0.04, 0.10], directShare: [0.55, 1.0],
  },
  groundworks: {
    keywords: ["groundworks", "ground works", "drainage", "foundation works", "foundations", "excavation", "civil engineering", "civils", "earthworks", "site preparation"],
    strongKeywords: ["groundworks package", "site preparation works", "drainage works", "foundation works"],
    cpvPrefixes: ["4511", "451112", "4522"], broadShare: [0.05, 0.12], directShare: [0.55, 1.0],
  },
  brickwork: {
    keywords: ["brickwork", "brick work", "masonry", "brick repair", "repointing", "pointing works"],
    strongKeywords: ["brickwork package", "masonry works", "repointing works"],
    cpvPrefixes: ["452625", "45262520", "45262522"], broadShare: [0.04, 0.10], directShare: [0.60, 1.0],
  },
  "structural-steel": {
    keywords: ["structural steel", "steelwork", "steel frame", "steelwork package", "metal framework"],
    strongKeywords: ["structural steelwork", "steel frame installation", "steelwork package"],
    cpvPrefixes: ["45223210", "452231"], broadShare: [0.04, 0.10], directShare: [0.60, 1.0],
  },
  demolition: {
    keywords: ["demolition", "strip out", "site clearance", "soft strip"],
    strongKeywords: ["demolition works", "demolition contract", "soft strip works"],
    cpvPrefixes: ["451111", "45111213"], broadShare: [0.03, 0.08], directShare: [0.60, 1.0],
  },
  landscaping: {
    keywords: ["landscaping", "landscape", "grounds works", "grounds improvement", "external works", "playground", "soft landscaping", "hard landscaping"],
    strongKeywords: ["landscaping works", "landscape works", "grounds improvement works"],
    cpvPrefixes: ["451127", "7731"], broadShare: [0.02, 0.07], directShare: [0.55, 1.0],
  },
  driveways: {
    keywords: ["driveway", "paving", "surfacing", "resurfacing", "car park", "tarmac", "asphalt"],
    strongKeywords: ["resurfacing works", "car park resurfacing", "paving works"],
    cpvPrefixes: ["452332", "452331", "452233"], broadShare: [0.02, 0.06], directShare: [0.55, 1.0],
  },
  "loft-conversion": {
    keywords: ["loft conversion", "attic conversion", "roof space conversion"], strongKeywords: ["loft conversion"],
    cpvPrefixes: [], broadShare: [0.05, 0.12], directShare: [0.65, 1.0],
  },
  "fit-out-interiors": {
    keywords: ["fit out", "fit-out", "shop fitting", "shopfitting", "interior refurbishment", "interior renovation", "workplace refurbishment", "tenant fit out", "tenant fit-out"],
    strongKeywords: ["retail fit out", "retail fit-out", "office fit out", "office fit-out", "shop fit out", "shop fit-out", "commercial fit out", "commercial fit-out", "cat a fit out", "cat a fit-out", "cat b fit out", "cat b fit-out"],
    cpvPrefixes: [], broadShare: [0.15, 0.45], directShare: [0.55, 1.0],
  },
  "general-builder": {
    keywords: ["construction works", "building works", "refurbishment", "renovation", "building extension", "extension works", "construction of an extension", "construction of extension", "building alterations", "fit out", "fit-out", "remodelling", "building maintenance", "capital works", "office renovation", "retail refurbishment", "commercial refurbishment", "commercial alterations"],
    strongKeywords: ["general building works", "building refurbishment", "construction contract", "refurbishment works", "commercial refurbishment", "office refurbishment"],
    cpvPrefixes: ["4500", "4521", "4545"], broadShare: [0.25, 0.55], directShare: [0.55, 1.0],
  },
};

export function matchSignalToTrades(signal: NormalizedMarketSignal, trades: TradeCategory[]): TradeSignalMatch[] {
  // Buyer names and generic notice metadata are deliberately excluded from the
  // scope corpus: "NHS Foundation Trust" must not become groundworks, and an
  // optional contract extension must not become a building extension.
  const haystack = normalizeText([signal.title, signal.summary].filter(Boolean).join(" "));
  const cpvCodes = signal.cpvCodes ?? [];
  const matches: TradeSignalMatch[] = [];

  for (const trade of trades) {
    const rule = RULES[trade.slug];
    if (!rule) continue;
    const strongKeyword = rule.strongKeywords?.find((keyword) => phraseMatch(haystack, keyword));
    const keyword = rule.keywords.find((candidate) => phraseMatch(haystack, candidate));
    const cpv = rule.cpvPrefixes?.find((prefix) => cpvCodes.some((code) => digits(code).startsWith(digits(prefix))));
    if (!strongKeyword && !keyword && !cpv) continue;

    const direct = Boolean(strongKeyword) || Boolean(cpv);
    let score = strongKeyword ? 94 : cpv ? 88 : 82;
    if (signal.signalType === "public_pipeline") score -= 7;
    if (signal.signalType === "contract_award") score += 2;
    if (signal.deadlineAt) {
      const days = (Date.parse(signal.deadlineAt) - Date.now()) / 86_400_000;
      if (days >= 0 && days <= 21) score += 3;
    }
    score = Math.max(50, Math.min(99, score));

    const reasons: string[] = [];
    if (strongKeyword) reasons.push(`Direct scope match: ${strongKeyword}`);
    else if (keyword) reasons.push(`Scope keyword: ${keyword}`);
    if (cpv) reasons.push(`Construction category match: CPV ${cpv}`);
    reasons.push(signalReason(signal.signalType));

    const [lowShare, highShare] = direct && rule.directShare ? rule.directShare : rule.broadShare;
    const projectLow = finiteNumber(signal.estimatedProjectValueLow);
    const projectHigh = finiteNumber(signal.estimatedProjectValueHigh) ?? projectLow;
    const valueLow = projectLow !== null ? roundMoney(projectLow * lowShare) : null;
    const valueHigh = projectHigh !== null ? roundMoney(projectHigh * highShare) : null;

    matches.push({
      tradeCategoryId: trade.id,
      fitScore: score,
      opportunityBucket: bucket(score),
      estimatedTradeValueLow: valueLow,
      estimatedTradeValueHigh: valueHigh,
      recommendedAction: recommendedAction(signal.signalType, signal.deadlineAt, signal.supplierName),
      matchReasons: reasons,
      matchMethod: "rules",
    });
  }

  return matches.sort((a, b) => b.fitScore - a.fitScore);
}

function phraseMatch(haystack: string, phrase: string) {
  const needle = normalizeText(phrase);
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(haystack);
}
function normalizeText(value: string) { return value.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim(); }
function digits(value: string) { return value.replace(/\D/g, ""); }

function signalReason(type: NormalizedMarketSignal["signalType"]) {
  if (type === "public_pipeline") return "Early public-sector pipeline signal";
  if (type === "contract_award") return "Award signal may expose a subcontract contact window";
  if (type === "commercial_development") return "Commercial development signal";
  return "Live procurement opportunity";
}

function recommendedAction(type: NormalizedMarketSignal["signalType"], deadlineAt?: string | null, supplierName?: string | null) {
  if (type === "public_pipeline") return "Identify the buyer and design/procurement team now, before the package reaches formal tender.";
  if (type === "contract_award") return supplierName
    ? `Approach ${supplierName} about the relevant subcontract package and reference the awarded project.`
    : "Identify the awarded main contractor and approach them about the relevant subcontract package.";
  if (type === "commercial_development") return "Identify the developer, architect and main contractor, then approach the package decision-maker before procurement closes.";
  if (deadlineAt) return `Review the tender documents and make a bid/no-bid decision before ${new Date(deadlineAt).toLocaleDateString("en-GB")}.`;
  return "Review the tender documents, qualify the package and make a bid/no-bid decision.";
}

function bucket(score: number): TradeSignalMatch["opportunityBucket"] { return score >= 90 ? "hot" : score >= 75 ? "strong" : score >= 50 ? "possible" : "low"; }
function finiteNumber(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }
function roundMoney(value: number) { return Math.round(value / 100) * 100; }
