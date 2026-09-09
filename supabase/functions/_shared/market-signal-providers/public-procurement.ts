import { createClient } from "jsr:@supabase/supabase-js@2";
import { normalizeOcdsPackage } from "./ocds.ts";
import type { MarketSignalProvider, NormalizedMarketSignal } from "./types.ts";

const DEFAULT_LIMIT = 100;

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
    const noticeTypes = [1, 2, 3, 101, 102, 103, 51, 52, 53, 54, 55, 56];
    for (const month of monthKeys) {
      for (const noticeType of noticeTypes) {
        if (output.length >= limit) return output.slice(0, limit);
        const params = new URLSearchParams({ dateFrom: month, noticeType: String(noticeType), outputType: "0" });
        if (this.locale) params.set("locale", String(this.locale));
        let payload: unknown;
        try { payload = await fetchJson(`${this.endpoint}?${params}`); }
        catch (error) { console.warn(`${this.name} notice type ${noticeType} unavailable`, error); continue; }
        output.push(...await normalizeOcdsPackage({ source: this.name, payload, sourceBaseUrl: this.endpoint, since }));
      }
    }
    return dedupe(output).slice(0, limit);
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (response.ok) return await response.json();

    // GOV.UK's public OCDS endpoints currently return 403 from the Supabase
    // Edge egress network while the same unauthenticated request succeeds
    // through the project's Postgres network. Use the allowlisted pg_net
    // bridge only for that network-specific rejection; never proxy arbitrary
    // hosts or silently mask normal upstream failures.
    if (response.status === 403) return await fetchJsonViaPgNet(url);

    const retryAfter = response.headers.get("Retry-After");
    throw new Error(`HTTP ${response.status}${retryAfter ? ` retry-after=${retryAfter}` : ""}`);
  } finally { clearTimeout(timeout); }
}

async function fetchJsonViaPgNet(url: string): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("pg_net fallback unavailable: Supabase service credentials missing");

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: requestId, error: queueError } = await admin.rpc("queue_public_market_signal_fetch", { p_url: url });
  if (queueError || requestId === null || requestId === undefined) {
    throw new Error(`pg_net fetch queue failed: ${queueError?.message ?? "no request id"}`);
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (attempt > 0) await sleep(125);
    const { data, error } = await admin.rpc("read_public_market_signal_fetch", { p_request_id: requestId });
    if (error) throw new Error(`pg_net response read failed: ${error.message}`);
    const row = Array.isArray(data) ? data[0] as { status_code?: number; content?: string; timed_out?: boolean; error_msg?: string | null } | undefined : undefined;
    if (!row) continue;
    if (row.timed_out) throw new Error("pg_net government API request timed out");
    if (row.error_msg) throw new Error(`pg_net government API request failed: ${row.error_msg}`);
    if (!row.status_code) continue;
    if (row.status_code < 200 || row.status_code >= 300) throw new Error(`HTTP ${row.status_code} via pg_net`);
    if (!row.content) throw new Error("Government API returned an empty response via pg_net");
    try { return JSON.parse(row.content); }
    catch { throw new Error("Government API returned invalid JSON via pg_net"); }
  }
  throw new Error("Timed out waiting for pg_net government API response");
}

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function normalizeSince(value?: string | null): string | null { if (!value) return daysAgo(3); const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : daysAgo(3); }
function daysAgo(days: number) { const date = new Date(); date.setUTCDate(date.getUTCDate() - days); return date.toISOString(); }
function withoutMillis(value: string) { return value.replace(/\.\d{3}Z$/, ""); }
function boundedLimit(value?: number) { return Math.max(1, Math.min(Number.isFinite(value) ? Math.floor(value!) : DEFAULT_LIMIT, 100)); }
function monthsBetween(start: Date, end: Date) { const values: string[] = []; const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1)); while (cursor <= stop) { values.push(`${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${cursor.getUTCFullYear()}`); cursor.setUTCMonth(cursor.getUTCMonth() + 1); } return values; }
function dedupe(values: NormalizedMarketSignal[]) { const seen = new Set<string>(); return values.filter((value) => { const key = `${value.source}:${value.sourceSignalId}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
