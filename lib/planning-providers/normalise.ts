import { createHash } from "node:crypto";
import type { NormalisedApplication, PlanningApplicationStatus, RawApplication } from "./types";

/**
 * Drives reprocess-on-change: ingestion upserts on (provider,
 * provider_application_id) and only flips classification_status to 'stale'
 * when this differs from the stored hash. Deliberately excludes fields that
 * change without the underlying project changing (e.g. nothing) or that
 * already have their own change signal (decision_date has its own column).
 */
export function computeContentHash(raw: RawApplication): string {
  const parts = [
    raw.proposalDescription ?? "",
    raw.applicationType ?? "",
    raw.stage ?? "",
    raw.statusRaw ?? "",
    raw.decisionOutcomeRaw ?? "",
    raw.decisionDueDate ?? "",
    raw.decisionDate ?? "",
  ].join("|");
  return createHash("sha256").update(parts).digest("hex");
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

export function normaliseApplication(raw: RawApplication): NormalisedApplication {
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
    content_hash: computeContentHash(raw),
    provider_changed_at: raw.changedAt,
  };
}
