import type { MarketSignalProvider, NormalizedMarketSignal } from "../market-signal-providers/types.ts";
import { defaultRights, sha256, type NormalizedProviderRecord, type ProviderAdapter, type ProviderFetchRequest, type ProviderSourceRecord } from "./types.ts";

export class MarketSignalAdapter implements ProviderAdapter {
  readonly kind = "source" as const;

  constructor(
    readonly key: string,
    readonly displayName: string,
    private readonly provider: MarketSignalProvider,
  ) {}

  isConfigured(): boolean {
    return true;
  }

  async fetch(request: ProviderFetchRequest): Promise<ProviderSourceRecord[]> {
    const signals = await this.provider.fetchSignals({ since: request.since, limit: request.limit });
    return Promise.all(signals.map(async (signal) => this.toSourceRecord(signal)));
  }

  async normalize(record: ProviderSourceRecord): Promise<NormalizedProviderRecord> {
    const payload = record.payload;
    const publishedAt = typeof payload.publishedAt === "string" ? payload.publishedAt : record.publishedAt ?? new Date().toISOString();
    return {
      ...record,
      eventObservations: [{
        eventType: `market_signal_${String(payload.signalType ?? "observed")}`,
        occurredAt: publishedAt,
        factualData: payload,
      }],
      signalObservations: [{
        signalType: String(payload.signalType ?? "market_signal"),
        confidence: 0.8,
        interpretation: { source: record.providerKey, title: payload.title ?? null },
      }],
    };
  }

  private async toSourceRecord(signal: NormalizedMarketSignal): Promise<ProviderSourceRecord> {
    const payload = signal as unknown as Record<string, unknown>;
    return {
      providerKey: this.key,
      recordType: "market_signal",
      externalId: signal.sourceSignalId,
      sourceUrl: signal.sourceUrl ?? null,
      publishedAt: signal.publishedAt ?? null,
      retrievedAt: new Date().toISOString(),
      contentHash: signal.contentHash ?? await sha256(JSON.stringify(payload)),
      payload,
      rights: defaultRights(false),
      isFixture: false,
    };
  }
}

