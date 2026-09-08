import type { NormalisedApplication, PlanningDataProvider, RawApplication } from "../types.ts";
import { normaliseApplication } from "../normalise.ts";
import { PlotaClient } from "./client.ts";
import type { PlotaApplication } from "./types.ts";

export class PlotaTierLimitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlotaTierLimitationError";
  }
}

const PRO_PLUS_TIERS = new Set(["pro", "business", "enterprise"]);

function toRawApplication(app: PlotaApplication): RawApplication {
  const appealStatus =
    app.appeal_status ??
    (typeof app.appeal === "string" ? app.appeal : app.appeal?.status ?? app.appeal?.outcome ?? null);

  const commercial =
    typeof app.commercial === "boolean"
      ? app.commercial
      : typeof app.commercial_work === "boolean"
        ? app.commercial_work
        : null;

  return {
    provider: "plota",
    providerId: app.id,
    reference: app.reference || app.id,
    authorityName: app.authority?.name ?? null,
    authorityCode: app.authority?.slug ?? null,
    addressText: app.address ?? null,
    postcode: app.postcode ?? null,
    latitude: app.location?.lat ?? null,
    longitude: app.location?.lng ?? null,
    applicationType: app.planning_route ?? app.category?.label ?? app.procedure ?? null,
    proposalDescription: app.description ?? app.proposal ?? null,
    stage: app.stage ?? null,
    statusRaw: app.status ?? null,
    decisionOutcomeRaw: app.decision?.outcome ?? null,
    receivedDate: app.date_received ?? null,
    validatedDate: app.date_validated ?? null,
    decisionDueDate: app.key_dates?.target_decision ?? null,
    decisionDate: app.date_decided ?? app.decision?.issued_date ?? null,
    appealStatus,
    dwellingCount: app.dwelling_count ?? null,
    isCommercial: commercial,
    floorspaceSqm: app.floorspace_sqm ?? null,
    // include_contact is never requested as true, so these are always
    // absent in practice — GDPR minimisation by not asking, not by filtering.
    applicantName: app.applicant_name ?? null,
    agentCompany: app.agent_company ?? null,
    // Plota's contract doesn't supply a factual project value — distinct
    // from the AI's own estimates computed later.
    estimatedValueGbp: null,
    sourceUrl: app.links?.council ?? app.links?.plota ?? null,
    changedAt: app.changed_at ?? null,
    raw: app as unknown as Record<string, unknown>,
  };
}

/**
 * Uses Plota's Demo-safe read path: bearer auth, ten-row pages and cursor
 * pagination. The optional plan tier is intentionally not required for Demo
 * operation; it only controls whether the change-feed path is attempted.
 */
export class PlotaPlanningProvider implements PlanningDataProvider {
  constructor(
    private readonly client: PlotaClient,
    private readonly planTier = "demo",
  ) {}

  async *fetchNewApplications({ since, cursor }: { since?: string; cursor?: string }): AsyncGenerator<RawApplication[]> {
    for await (const page of this.client.paginate("/applications", { date_from: since, cursor })) {
      yield page.map(toRawApplication);
    }
  }

  /**
   * changed_since is Pro+ only. On the Demo key this throws immediately and
   * the ingestion function falls back to rotating individual pending rows.
   */
  async *fetchUpdatedApplications({ since, cursor }: { since: string; cursor?: string }): AsyncGenerator<RawApplication[]> {
    if (!PRO_PLUS_TIERS.has(this.planTier)) {
      throw new PlotaTierLimitationError(
        \`changed_since is not available on the Plota "\${this.planTier}" plan — fall back to re-checking individual undecided applications via getApplication().\`,
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

  normaliseApplication(raw: RawApplication): Promise<NormalisedApplication> {
    return normaliseApplication(raw);
  }
}
