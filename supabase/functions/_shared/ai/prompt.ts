interface ApplicationForPrompt {
  application_type: string | null;
  proposal_description: string | null;
  dwelling_count: number | null;
  is_commercial: boolean | null;
  floorspace_sqm: number | null;
  postcode_district: string | null;
  status: string;
}

interface TradeCategoryHint {
  slug: string;
  name: string;
  ai_detection_hints: unknown;
}

/**
 * Only real Plota/mock-provider fields go in — never invented context, and
 * never applicant/agent contact details (the outreach assistant's "never
 * fabricate a relationship" rule starts here, at the input boundary).
 */
export function buildEnrichmentInput(application: ApplicationForPrompt, tradeCategories: TradeCategoryHint[]): string {
  const tradeList = tradeCategories
    .map((t) => `- ${t.slug} (${t.name}): ${JSON.stringify(t.ai_detection_hints ?? {})}`)
    .join("\n");

  return [
    "Planning application details:",
    `Application type: ${application.application_type ?? "unknown"}`,
    `Proposal description: ${application.proposal_description ?? "(no description provided)"}`,
    `Dwelling count: ${application.dwelling_count ?? "not specified"}`,
    `Commercial work: ${application.is_commercial === null ? "unknown" : application.is_commercial ? "yes" : "no"}`,
    `Floorspace (sqm): ${application.floorspace_sqm ?? "not specified"}`,
    `Postcode district: ${application.postcode_district ?? "unknown"}`,
    `Planning status: ${application.status}`,
    "",
    "Available trade categories (use exactly these slugs in trade_category_slug — do not invent new ones):",
    tradeList,
  ].join("\n");
}
