import "server-only";
import type { NormalisedApplication, PlanningDataProvider, RawApplication } from "../types";
import { normaliseApplication } from "../normalise";
import { PlotaClient } from "./client";
import type { PlotaApplication } from "./types";

export class PlotaTierLimitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlotaTierLimitationError";
  }
}

const PRO_PLUS_TIERS = new Set(["pro", "business", "enterprise"]);

// Plota's documented application object has no distinct free-text address
// field in the verified contract (only postcode + lat/lng) — address_text
// stays null rather than guessing at an undocumented field name.
function toRawApplication(app: PlotaApplication): RawApplication {
  return {
    provider: "plota",
    providerId: app.id,
    reference: app.reference,
    authorityName: app.authority?.name ?? null,
    authorityCode: app.authority?.slug ?? null,
    addressText: null,
    postcode: app.postcode ?? null,
    latitude: app.location?.lat ?? null,
    longitude: app.location?.lng ?? null,
    applicationType: app.category?.label ?? null,
    proposalDescription: app.proposal ?? null,
    stage: app.stage ?? null,
    statusRaw: app.status ?? null,
    decisionOutcomeRaw: app.decision?.outcome ?? null,
    receivedDate: app.date_received ?? null,
    validatedDate: app.date_validated ?? null,
    decisionDueDate: app.key_dates?.target_decision ?? null,
    decisionDate: app.decision?.issued_date ?? null,
    appealStatus: app.appeal_status ?? null,
    dwellingCount: app.dwelling_count ?? null,
    isCommercial: app.commercial_work ?? null,
    floorspaceSqm: app.floorspace_sqm ?? null,
    // include_contact is never requested as true, so these are always
    // absent in practice — GDPR minimisation by not asking, not by filtering.
    applicantName: app.applicant_name ?? null,
    agentCompany: app.agent_company ?? null,
    // Plota's contract doesn't supply a factual project value (rare/absent
    // by design) — distinct from the AI's own estimates computed later.
    estimatedValueGbp: null,
    sourceUrl: app.links?.council ?? app.links?.plota ?? null,
    changedAt: app.changed_at ?? null,
    raw: app as unknown as Record<string, unknown>,
  };
}

/**
 * Built against the verified Plota API contract (base URL, auth, endpoints,
 * pagination, rate limits, error shape, field mapping — see plan section
 * 8.2). Not the active default; PLANNING_PROVIDER=mock is, until
 * PLOTA_API_KEY is set.
 */
export class PlotaPlanningProvider implements PlanningDataProvider {
  constructor(
    private readonly client: PlotaClient,
    private readonly planTier: string,
  ) {}

  async *fetchNewApplications({ since, cursor }: { since?: string; cursor?: string }): AsyncGenerator<RawApplication[]> {
    for await (const page of this.client.paginate("/applications", { date_from: since, cursor })) {
      yield page.map(toRawApplication);
    }
  }

  /**
   * changed_at/changed_since are Pro+ only. On Starter/Demo this throws
   * rather than silently returning nothing — the caller (the ingestion
   * function, which knows which of OUR rows are still undecided) is
   * responsible for the documented fallback: re-check individual pending
   * applications on a rotation via getApplication(). That rotation logic
   * belongs there, not here — this provider has no knowledge of our schema.
   */
  async *fetchUpdatedApplications({ since, cursor }: { since: string; cursor?: string }): AsyncGenerator<RawApplication[]> {
    if (!PRO_PLUS_TIERS.has(this.planTier)) {
      throw new PlotaTierLimitationError(
        `changed_since is not available on the Plota "${this.planTier}" plan — fall back to re-checking ` +
          "individual undecided applications via getApplication() instead.",
      );
    }
    for await (const page of this.client.paginate("/applications", { changed_since: since, cursor })) {
      yield page.map(toRawApplication);
    }
  }

  async getApplication(providerId: string): Promise<RawApplication | null> {
    const app = await this.client.getApplication(providerId);
    return app ? toRawApplication(app) : null;
  }

  async searchByPostcode(postcodeOrDistrict: string, opts?: { radius?: number }): Promise<RawApplication[]> {
    const trimmed = postcodeOrDistrict.trim().toUpperCase();
    // A space means a full postcode ("NR15 1AB") -> nearby search; no space
    // means a bare district ("NR15") -> the plain list endpoint.
    if (/\s/.test(trimmed)) {
      const radius = Math.min(opts?.radius ?? 1000, 5000);
      const apps = await this.client.list("/applications/nearby", { postcode: trimmed, radius });
      return apps.map(toRawApplication);
    }
    const apps = await this.client.list("/applications", { postcode: trimmed });
    return apps.map(toRawApplication);
  }

  async searchByDate(dateFrom: string, dateTo: string): Promise<RawApplication[]> {
    const apps = await this.client.list("/applications", { date_from: dateFrom, date_to: dateTo });
    return apps.map(toRawApplication);
  }

  normaliseApplication(raw: RawApplication): NormalisedApplication {
    return normaliseApplication(raw);
  }
}
