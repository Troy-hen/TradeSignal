// Deno-native copy for the ingest-planning-applications Edge Function.
// Mirrors the planning_application_status enum in
// supabase/migrations/20260907160300_planning_core.sql exactly.
export type PlanningApplicationStatus =
  | "submitted"
  | "validated"
  | "under_consideration"
  | "decision_expected"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "appeal_lodged"
  | "unknown";

/**
 * The shared wire shape both providers produce before normalisation. Shaped
 * closely after Plota's own documented application object (the richest
 * concrete schema available) — MockPlanningProvider generates fixtures
 * directly in this shape since it's synthetic data anyway, and
 * PlotaPlanningProvider maps its raw JSON into it. `raw` always holds the
 * complete original payload for `planning_applications.raw_provider_payload`.
 */
export interface RawApplication {
  provider: string;
  providerId: string;
  reference: string;
  authorityName: string | null;
  authorityCode: string | null;
  addressText: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  applicationType: string | null;
  proposalDescription: string | null;
  /** Provider's normalized stage vocabulary (e.g. Plota: pending/decided/withdrawn). */
  stage: string | null;
  /** Verbatim council wording — display only, never filtered on. */
  statusRaw: string | null;
  decisionOutcomeRaw: string | null;
  receivedDate: string | null;
  validatedDate: string | null;
  decisionDueDate: string | null;
  decisionDate: string | null;
  appealStatus: string | null;
  dwellingCount: number | null;
  isCommercial: boolean | null;
  floorspaceSqm: number | null;
  applicantName: string | null;
  agentCompany: string | null;
  estimatedValueGbp: number | null;
  sourceUrl: string | null;
  /** Pro+ only change-feed timestamp — distinct from a generic `updated_at`. */
  changedAt: string | null;
  raw: Record<string, unknown>;
}

/** Maps 1:1 onto planning_applications' insertable columns (minus id/timestamps). */
export interface NormalisedApplication {
  provider: string;
  provider_application_id: string;
  local_planning_authority: string | null;
  local_planning_authority_code: string | null;
  planning_reference: string;
  address_text: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  application_type: string | null;
  proposal_description: string | null;
  status: PlanningApplicationStatus;
  status_raw: string | null;
  decision_outcome_raw: string | null;
  received_date: string | null;
  validated_date: string | null;
  decision_due_date: string | null;
  decision_date: string | null;
  appeal_status: string | null;
  dwelling_count: number | null;
  is_commercial: boolean | null;
  floorspace_sqm: number | null;
  applicant_name: string | null;
  agent_company: string | null;
  estimated_value_gbp: number | null;
  source_url: string | null;
  raw_provider_payload: Record<string, unknown>;
  content_hash: string;
  provider_changed_at: string | null;
}

export interface PlanningDataProvider {
  fetchNewApplications(params: { since?: string; dateTo?: string; cursor?: string }): AsyncGenerator<RawApplication[]>;
  fetchUpdatedApplications(params: { since: string; cursor?: string }): AsyncGenerator<RawApplication[]>;
  getApplication(providerId: string): Promise<RawApplication | null>;
  searchByPostcode(postcodeOrDistrict: string, opts?: { radius?: number; maxPages?: number; dateFrom?: string; dateTo?: string }): Promise<RawApplication[]>;
  searchByDate(dateFrom: string, dateTo: string): Promise<RawApplication[]>;
  normaliseApplication(raw: RawApplication): Promise<NormalisedApplication>;
}
