type PlanningEvidence = {
  application_type: string | null;
  proposal_description: string | null;
};

type CategoryEvidence = {
  slug: string;
  name: string;
  ai_detection_hints: unknown;
};

/**
 * Produces a reproducible relevance score from source text and versioned
 * taxonomy hints. AI may nominate a category, but it does not set this number.
 */
export function deterministicPlanningFitScore(
  application: PlanningEvidence,
  category: CategoryEvidence,
): number {
  const corpus = normalize([application.application_type, application.proposal_description].filter(Boolean).join(" "));
  const hints = asRecord(category.ai_detection_hints);
  const strongKeywords = stringList(hints.strongKeywords);
  const keywords = stringList(hints.keywords);

  if (phraseMatch(corpus, category.name) || phraseMatch(corpus, category.slug.replace(/-/g, " "))) return 95;
  if (strongKeywords.some((term) => phraseMatch(corpus, term))) return 95;
  if (keywords.some((term) => phraseMatch(corpus, term))) return 85;

  // The category has passed strict structured-output validation but has no
  // explicit lexical evidence. Keep it visible as a moderate inferred match;
  // the inference is shown separately through confidence and evidence copy.
  return 58;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function phraseMatch(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase);
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(haystack);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[–—_]/g, "-").replace(/-/g, " ").replace(/\s+/g, " ").trim();
}
