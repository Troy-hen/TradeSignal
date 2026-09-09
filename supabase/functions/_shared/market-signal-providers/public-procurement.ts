import { normalizeOcdsPackage } from "./ocds.ts";
import type { MarketSignalProvider, NormalizedMarketSignal } from "./types.ts";

const DEFAULT_LIMIT = 100;

type JsonRecord = Record<string, unknown>;

export function createPublicProcurementProvider(name: string): MarketSignalProvider {
  switch (name) {
    case "find-a-tender": return new FindATenderProvider();
    case "contracts-finder": return new ContractsFinderProvider();
    case "sell2wales": return new MonthlyNoticeProvider("sell2wales", "https://api.sell2wales.gov.wales/v1/Notices", 2057);
    case "public-contracts-scotland": return new MonthlyNoticeProvider("public-contracts-scotland", "https://api.publiccontractsscotland.gov.uk/v1/Notices");
    default: throw new Error(`Unsupported market signal provider: ${name}`);
  }
}

class FindATenderProvider implements MarketSignalProvider {
  readonly name = "find-a-tender";

  async fetchSignals(input: { since?: string | null; limit?: number }): Promise<NormalizedMarketSignal[]> {
    const since = normalizeSince(input.since);
    const limit = boundedLimit(input.limit);
    const params = new URLSearchParams({ limit: String(limit), stages: "planning,tender,award" });
    if (since) params.set("updatedFrom", withoutMillis(since));
    params.set("updatedTo", withoutMillis(new Date().toISOString()));
    const payload = await fetchJson(`https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?${params}`);
    return normalizeOcdsPackage({ source: this.name, payload, sourceBaseUrl: "https://www.find-tender.service.gov.uk/", since });
  }
}

class ContractsFinderProvider implements MarketSignalProvider {
  readonly name = "contracts-finder";

  async fetchSignals(input: { since?: string | null; limit?: number }): Promise<NormalizedMarketSignal[]> {
    const since = normalizeSince(input.since);
    const limit = boundedLimit(input.limit);
    const params = new URLSearchParams({ limit: String(limit), stages: "planning,tender,award" });
    if (since) params.set("publishedFrom", since);
    params.set("publishedTo", new Date().toISOString());
    const payload = await fetchJson(`https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?${params}`);
    return normalizeOcdsPackage({ source: this.name, payload, sourceBaseUrl: "https://www.contractsfinder.service.gov.uk/", since });
  }
}

class MonthlyNoticeProvider implements MarketSignalProvider {
  constructor(readonly name: string, private readonly endpoint: string, private readonly locale?: number) {}

  async fetchSignals(input: { since?: string | null; limit?: number }): Promise<NormalizedMarketSignal[]> {
    const since = normalizeSince(input.since) ?? daysAgo(7);
    const limit = boundedLimit(input.limit);
    const monthKeys = monthsBetween(new Date(since), new Date()).slice(-2);
    const output: NormalizedMarketSignal[] = [];
    // Legacy S2W/PCS OCDS interfaces expose notice lists by month/type. We
    // request PIN/contract/award plus their site-notice equivalents, then
    // normalize them into the same MyTradeBox signal model.
    const noticeTypes = [1, 2, 3, 101, 102, 103, 51, 52, 53, 54, 55, 56];
    for (const month of monthKeys) {
      for (const noticeType of noticeTypes) {
        if (output.length >= limit) return output.slice(0, limit);
        const params = new URLSearchParams({ dateFrom: month, noticeType: String(noticeType), outputType: "0" });
        if (this.locale) params.set("locale", String(this.locale));
        let payload: unknown;
        try {
          payload = await fetchJson(`${this.endpoint}?${params}`);
        } catch (error) {
          // Some notice type codes are not supported by every national
          // portal/version. Skip unsupported combinations without losing the
          // rest of the feed.
          console.warn(`${this.name} notice type ${noticeType} unavailable`, error);
          continue;
        }
        const signals = await normalizeOcdsPackage({ source: this.name, payload, sourceBaseUrl: this.endpoint, since });
        output.push(...signals);
      }
    }
    return dedupe(output).slice(0, limit);
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "MyTradeBox/1.0 trade-intelligence" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const retryAfter = response.headers.get("Retry-After");
      throw new Error(`HTTP ${response.status}${retryAfter ? ` retry-after=${retryAfter}` : ""}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSince(value?: string | null): string | null {
  if (!value) return daysAgo(3);
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : daysAgo(3);
}
function daysAgo(days: number) { const date = new Date(); date.setUTCDate(date.getUTCDate() - days); return date.toISOString(); }
function withoutMillis(value: string) { return value.replace(/\.\d{3}Z$/, ""); }
function boundedLimit(value?: number) { return Math.max(1, Math.min(Number.isFinite(value) ? Math.floor(value!) : DEFAULT_LIMIT, 100)); }
function monthsBetween(start: Date, end: Date) {
  const values: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= stop) {
    values.push(`${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${cursor.getUTCFullYear()}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return values;
}
function dedupe(values: NormalizedMarketSignal[]) {
  const seen = new Set<string>();
  return values.filter((value) => { const key = `${value.source}:${value.sourceSignalId}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
