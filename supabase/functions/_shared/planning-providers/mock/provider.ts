import type { NormalisedApplication, PlanningDataProvider, RawApplication } from "../types.ts";
import { normaliseApplication } from "../normalise.ts";
import { generateMockApplications } from "./fixtures.ts";

const PAGE_SIZE = 25;

function parseCursor(cursor: string | undefined): number {
  const offset = Number(cursor ?? "0");
  return Number.isFinite(offset) && offset >= 0 ? offset : 0;
}

async function* paginate(items: RawApplication[], cursor: string | undefined): AsyncGenerator<RawApplication[]> {
  let offset = parseCursor(cursor);
  while (offset < items.length) {
    yield items.slice(offset, offset + PAGE_SIZE);
    offset += PAGE_SIZE;
  }
}

/**
 * Fully working, zero-dependency provider generating realistic UK-style
 * fixtures across every seeded postcode district. Drives seed data, local
 * dev, and the full ingestion->enrichment->matching->dashboard pipeline
 * end-to-end with no external credentials — the active default provider
 * (PLANNING_PROVIDER=mock).
 */
export class MockPlanningProvider implements PlanningDataProvider {
  // Generated once per invocation (module-scope cache below), not per call —
  // keeps repeated ingestion runs against a stable dataset.
  constructor(private readonly applications: RawApplication[]) {}

  async *fetchNewApplications({ since, cursor }: { since?: string; cursor?: string }): AsyncGenerator<RawApplication[]> {
    const sinceTime = since ? new Date(since).getTime() : 0;
    const filtered = this.applications
      .filter((app) => new Date(app.receivedDate ?? 0).getTime() >= sinceTime)
      .sort((a, b) => new Date(a.receivedDate ?? 0).getTime() - new Date(b.receivedDate ?? 0).getTime());
    yield* paginate(filtered, cursor);
  }

  async *fetchUpdatedApplications({ since, cursor }: { since: string; cursor?: string }): AsyncGenerator<RawApplication[]> {
    const sinceTime = new Date(since).getTime();
    const filtered = this.applications
      .filter((app) => new Date(app.changedAt ?? app.receivedDate ?? 0).getTime() >= sinceTime)
      .sort((a, b) => new Date(a.changedAt ?? 0).getTime() - new Date(b.changedAt ?? 0).getTime());
    yield* paginate(filtered, cursor);
  }

  async getApplication(providerId: string): Promise<RawApplication | null> {
    return this.applications.find((app) => app.providerId === providerId) ?? null;
  }

  async searchByPostcode(postcodeOrDistrict: string): Promise<RawApplication[]> {
    const district = postcodeOrDistrict.trim().toUpperCase().split(" ")[0];
    return this.applications.filter((app) => (app.postcode ?? "").toUpperCase().startsWith(district));
  }

  async searchByDate(dateFrom: string, dateTo: string): Promise<RawApplication[]> {
    const from = new Date(dateFrom).getTime();
    const to = new Date(dateTo).getTime();
    return this.applications.filter((app) => {
      const received = new Date(app.receivedDate ?? 0).getTime();
      return received >= from && received <= to;
    });
  }

  normaliseApplication(raw: RawApplication): Promise<NormalisedApplication> {
    return normaliseApplication(raw);
  }
}

let cached: RawApplication[] | null = null;

/** Process-scope cache: one generated dataset per Edge Function instance. */
export function getMockPlanningProvider(): MockPlanningProvider {
  if (!cached) cached = generateMockApplications();
  return new MockPlanningProvider(cached);
}
