import type { NormalisedApplication, PlanningApplicationStatus, RawApplication } from "./types.ts";

/**
 * Drives reprocess-on-change: the upsert_planning_application() RPC only
 * flips classification_status to 'stale' when this differs from the stored
 * hash. Deliberately excludes fields that already have their own change
 * signal (decision_date has its own column).
 *
 * Deno uses the Web Crypto API rather than Node's crypto module — SubtleCrypto
 * is native here with no npm/node compat config needed.
 */
export async function computeContentHash(raw: RawApplication): Promise<string> {
  const parts = [
    raw.proposalDescription ?? "",
    raw.applicationType ?? "",
    raw.stage ?? "",
    raw.statusRaw ?? "",
    raw.decisionOutcomeRaw ?? "",
    raw.decisionDueDate ?? "",
    raw.decisionDate ?? "",
  ].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Conservative by design: an ambiguous stage maps to 'unknown' rather than
 * guessing, since council wording for `stage`/`status` varies too much to
 * infer confidently. Shared by every provider so status semantics never
 * drift between Mock and Plota.
 */
export function mapStatus(raw: RawApplication): PlanningApplicationStatus {
  const stage = (raw.stage ?? "").toLowerCase();
  const outcome = (raw.decisionOutcomeRaw ?? "").toLowerCase();

  if (stage === "withdrawn" || outcome.includes("withdrawn")) return "withdrawn";
  if (raw.appealStatus) return "appeal_lodged";

  if (stage === "decided" || raw.decisionDate) {
    if (outcome.includes("approv") || outcome.includes("grant") || outcome.includes("permit")) return "approved";
    if (outcome.includes("refus") || outcome.includes("reject") || outcome.includes("dismiss")) return "rejected";
    return "unknown";
  }

  if (stage === "pending") {
    if (raw.decisionDueDate) {
      const due = new Date(raw.decisionDueDate).getTime();
      if (!Number.isNaN(due) && due - Date.now() < 14 * 24 * 60 * 60 * 1000) {
        return "decision_expected";
      }
    }
    if (raw.validatedDate) return "under_consideration";
    if (raw.receivedDate) return "submitted";
    return "unknown";
  }

  return "unknown";
}

export async function normaliseApplication(raw: RawApplication): Promise<NormalisedApplication> {
  return {
    provider: raw.provider,
    provider_application_id: raw.providerId,
    local_planning_authority: raw.authorityName,
    local_planning_authority_code: raw.authorityCode,
    planning_reference: raw.reference,
    address_text: raw.addressText,
    postcode: raw.postcode,
    latitude: raw.latitude,
    longitude: raw.longitude,
    application_type: raw.applicationType,
    proposal_description: raw.proposalDescription,
    status: mapStatus(raw),
    status_raw: raw.statusRaw,
    decision_outcome_raw: raw.decisionOutcomeRaw,
    received_date: raw.receivedDate,
    validated_date: raw.validatedDate,
    decision_due_date: raw.decisionDueDate,
    decision_date: raw.decisionDate,
    appeal_status: raw.appealStatus,
    dwelling_count: raw.dwellingCount,
    is_commercial: raw.isCommercial,
    floorspace_sqm: raw.floorspaceSqm,
    applicant_name: raw.applicantName,
    agent_company: raw.agentCompany,
    estimated_value_gbp: raw.estimatedValueGbp,
    source_url: raw.sourceUrl,
    raw_provider_payload: raw.raw,
    content_hash: await computeContentHash(raw),
    provider_changed_at: raw.changedAt,
  };
}
