import "server-only";

type NormalizedProfileLike = {
  label?: string;
  keywords?: string[];
  buyerTypes?: string[];
  candidateTradeSlug?: string | null;
  confidence?: number;
  source?: string;
};

export type CustomerRelevanceProfile = {
  what_do_you_sell?: string | null;
  ideal_customer?: string | null;
  exclusions?: string | null;
  where_do_you_sell?: string | null;
  normalized_profile?: NormalizedProfileLike | null;
};

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "that", "this", "your", "sell",
  "selling", "services", "service", "business", "businesses", "commercial",
  "customers", "customer", "company", "companies", "uk", "united", "kingdom",
]);

const SYNONYMS: Array<[RegExp, string[]]> = [
  [/epos|payment|card terminal|till|ordering/i, ["hospitality", "restaurant", "cafe", "pub", "hotel", "retail", "checkout"]],
  [/\bit\b|managed it|it support|cyber|technology/i, ["managed it", "technology", "cyber", "office", "business"]],
  [/account|bookkeep|finance|tax|payroll/i, ["office", "business", "finance", "professional services"]],
  [/fit.?out|shopfit|interior|refurb|refit/i, ["fit-out", "interiors", "office", "retail", "workshop", "premises", "conversion"]],
  [/broadband|connectivity|telecom|voip|wifi|internet/i, ["office", "retail", "warehouse", "business", "premises", "connectivity"]],
  [/cctv|security|access control|alarm/i, ["security", "access", "premises", "commercial", "warehouse", "retail"]],
  [/roof|roofing|re-roof/i, ["roof", "roofing", "re-roof", "storm damage", "industrial", "commercial"]],
  [/landscap|driveway|groundwork/i, ["landscaping", "driveway", "groundworks", "development", "commercial"]],
  [/electrical|electrician|ev charg|solar|energy/i, ["electrical", "energy", "commercial", "industrial", "property"]],
];

export function profileRelevanceScore(profile: CustomerRelevanceProfile | null | undefined, text: string): number {
  if (!profile?.what_do_you_sell?.trim()) return 0;
  const haystack = normalize(text);
  const normalized = profile.normalized_profile ?? {};
  const terms = [
    normalized.label,
    ...(normalized.keywords ?? []),
    ...(normalized.buyerTypes ?? []),
    normalized.candidateTradeSlug?.replace(/[-_]/g, " "),
    profile.what_do_you_sell,
    profile.ideal_customer,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const excluded = [
    profile.exclusions,
    ...(Array.isArray((normalized as Record<string, unknown>).exclusions) ? ((normalized as Record<string, unknown>).exclusions as string[]) : []),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (excluded.some((term) => termMatches(term, haystack))) return -100;
  let score = 0;
  for (const term of terms) {
    const cleaned = normalize(term);
    if (!cleaned || STOP_WORDS.has(cleaned)) continue;
    if (haystack.includes(cleaned)) score += cleaned.includes(" ") ? 12 : 8;
    const tokens = meaningfulTokens(cleaned);
    const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
    score += Math.min(tokenHits, 3) * 2;
    const synonymGroup = SYNONYMS.find(([pattern]) => pattern.test(term));
    if (synonymGroup) score += synonymGroup[1].filter((synonym) => haystack.includes(normalize(synonym))).length * 3;
  }
  return score;
}

export function relevantNeedLabels(profile: CustomerRelevanceProfile | null | undefined, labels: string[]): string[] {
  if (!profile?.what_do_you_sell?.trim() || labels.length === 0) return labels;
  const matched = labels.filter((label) => profileRelevanceScore(profile, label) > 0);
  return matched.length > 0 ? matched : labels;
}

export function rankByCustomerProfile<T>(
  items: T[],
  profile: CustomerRelevanceProfile | null | undefined,
  getText: (item: T) => string,
): T[] {
  if (!profile?.what_do_you_sell?.trim()) return items;
  const scored = items.map((item, index) => ({
    item,
    index,
    score: profileRelevanceScore(profile, getText(item)),
  }));
  const relevant = scored.filter((entry) => entry.score > 0);
  return relevant.sort((a, b) => b.score - a.score || a.index - b.index).map((entry) => entry.item);
}

function termMatches(term: string, haystack: string): boolean {
  const cleaned = normalize(term);
  if (!cleaned) return false;
  if (haystack.includes(cleaned)) return true;
  const tokens = meaningfulTokens(cleaned);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

function meaningfulTokens(value: string): string[] {
  return value.split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
