import { getPlanningProvider } from "../planning-providers/index.ts";
import type { NormalisedApplication, RawApplication } from "../planning-providers/types.ts";
import { defaultRights, sha256, type NormalizedProviderRecord, type ProviderAdapter, type ProviderFetchRequest, type ProviderSourceRecord } from "./types.ts";

export class PlanningAdapter implements ProviderAdapter {
  readonly kind = "source" as const;

  constructor(
    readonly key: string,
    readonly displayName: string,
    private readonly provider = getPlanningProvider(),
  ) {}

  isConfigured(): boolean {
    return this.key === "mock" || Boolean(Deno.env.get("PLOTA_API_KEY"));
  }

  async fetch(request: ProviderFetchRequest): Promise<ProviderSourceRecord[]> {
    const from = request.since ?? daysAgo(7);
    const to = request.until ?? new Date().toISOString().slice(0, 10);
    const applications = await this.provider.searchByDate(from.slice(0, 10), to.slice(0, 10));
    const bounded = applications.slice(0, Math.max(1, Math.min(request.limit ?? 100, 250)));
    return Promise.all(bounded.map((raw) => this.toSourceRecord(raw)));
  }

  async normalize(record: ProviderSourceRecord): Promise<NormalizedProviderRecord> {
    const raw = record.payload as unknown as RawApplication;
    const application = await this.provider.normaliseApplication(raw);
    const eventType = application.status === "approved" ? "planning_approved" : application.status === "rejected" ? "planning_rejected" : "planning_activity";
    const occurredAt = application.decision_date ?? application.received_date ?? record.retrievedAt;
    return {
      ...record,
      entityObservation: {
        name: application.applicant_name ?? application.agent_company,
        website: null,
        postcode: application.postcode,
        resolutionMethod: "source_record_only",
        resolutionConfidence: 0.25,
      },
      eventObservations: [{ eventType, occurredAt, factualData: application as unknown as Record<string, unknown> }],
      signalObservations: [{
        signalType: application.is_commercial ? "commercial_planning_activity" : "planning_activity",
        confidence: 0.75,
        interpretation: { classificationPending: true, planningReference: application.planning_reference },
      }],
    };
  }

  private async toSourceRecord(raw: RawApplication): Promise<ProviderSourceRecord> {
    const payload = raw as unknown as Record<string, unknown>;
    return {
      providerKey: this.key,
      recordType: "planning_application",
      externalId: raw.providerId,
      sourceUrl: raw.sourceUrl,
      publishedAt: raw.receivedDate,
      retrievedAt: new Date().toISOString(),
      contentHash: await sha256(JSON.stringify(payload)),
      payload,
      rights: defaultRights(this.key === "mock"),
      isFixture: this.key === "mock",
    };
  }
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

export type { NormalisedApplication };

