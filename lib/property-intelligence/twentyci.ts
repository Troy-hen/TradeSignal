import "server-only";
import type {
  PropertyActivitySignal,
  PropertyIntelligenceProvider,
  PropertyIntelligenceSnapshot,
  PropertyPlanningRecord,
  PropertyTransaction,
  PropertyTrigger,
} from "./types";

const BASE_URL = "https://api.twentyci.co.uk/api/v2";
const TOKEN_URL = "https://api.twentyci.co.uk/oauth/token";
const MATCH_THRESHOLD = 0.68;

let tokenCache: { accessToken: string; expiresAtMs: number } | null = null;

type TwentyConfig = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
};

type TwentyPropertyRow = {
  id?: string | number;
  attributes?: Record<string, unknown>;
};

export class TwentyCiPropertyIntelligenceProvider implements PropertyIntelligenceProvider {
  readonly name = "twentyci";

  constructor(private readonly config: TwentyConfig) {}

  async enrichProperty(input: { address: string; postcode: string }): Promise<PropertyIntelligenceSnapshot | null> {
    const postcode = normalisePostcode(input.postcode);
    const addressLine = firstAddressLine(input.address);
    if (!postcode || !addressLine) return null;

    const search = await this.request<{ data?: TwentyPropertyRow[] }>("/properties/postcode-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcode, address: addressLine }),
    });

    const candidate = choosePropertyCandidate(search.data ?? [], addressLine, postcode);
    if (!candidate || candidate.score < MATCH_THRESHOLD) return null;

    const uprn = String(candidate.row.id ?? "").trim();
    if (!uprn) return null;

    const [property, details, triggersResponse, transactionsResponse, planningResponse, likelyToSellResponse] = await Promise.all([
      this.optionalRequest<Record<string, unknown>>(`/properties/${encodeURIComponent(uprn)}`),
      this.optionalRequest<Record<string, unknown>>(`/properties/${encodeURIComponent(uprn)}/details`),
      this.optionalRequest<Record<string, unknown>>(`/properties/${encodeURIComponent(uprn)}/triggers`),
      this.optionalRequest<Record<string, unknown>>(`/properties/${encodeURIComponent(uprn)}/transactions`),
      this.optionalRequest<Record<string, unknown>>(`/properties/${encodeURIComponent(uprn)}/plannings`),
      this.optionalRequest<Record<string, unknown>>(`/${encodeURIComponent(uprn)}/likely-to-sell`),
    ]);

    const searchAttributes = candidate.row.attributes ?? {};
    const propertyAttributes = dataAttributes(property) ?? {};
    const detailAttributes = dataAttributes(details) ?? {};
    const triggers = parseTriggers(triggersResponse);
    const transactions = parseTransactions(transactionsResponse);
    const planningHistory = parsePlanningHistory(planningResponse);
    const latestTrigger = latestByDate(triggers);
    const latestTransaction = latestByDate(transactions);
    const likelyToSellPercentile = findFirstNumber(likelyToSellResponse, [
      "lts_percentile",
      "percentile",
      "likely_to_sell_percentile",
      "likelyToSellPercentile",
      "score",
    ]);
    const activity = derivePropertyActivity({ latestTrigger, latestTransaction, likelyToSellPercentile });

    return {
      provider: this.name,
      uprn,
      matchMethod: "postcode_address",
      matchConfidence: candidate.score,
      matchedAddress: firstString(propertyAttributes.address, searchAttributes.address, detailAttributes.address1),
      postcode: firstString(propertyAttributes.postcode, searchAttributes.postcode, detailAttributes.postcode),
      estimatedValueGbp: firstNumber(detailAttributes.estimated_value, propertyAttributes.avm_value, searchAttributes.avm_value),
      valueMinGbp: firstNumber(propertyAttributes.value_min, searchAttributes.value_min),
      valueMaxGbp: firstNumber(propertyAttributes.value_max, searchAttributes.value_max),
      avmConfidence: firstNumber(propertyAttributes.avm_confidence, searchAttributes.avm_confidence),
      bedrooms: firstInteger(detailAttributes.number_of_bed_rooms, detailAttributes.bedrooms),
      bathrooms: firstInteger(detailAttributes.number_of_bath_rooms, detailAttributes.bathrooms),
      garden: firstBoolean(detailAttributes.garden),
      parking: firstBoolean(detailAttributes.parking),
      latestTriggerType: latestTrigger?.type ?? null,
      latestTriggerDate: latestTrigger?.date ?? null,
      lastTransactionDate: latestTransaction?.date ?? null,
      lastTransactionPriceGbp: latestTransaction?.price ?? null,
      likelyToSellPercentile,
      activitySignal: activity.signal,
      activityReasons: activity.reasons,
      triggerHistory: triggers.slice(0, 12),
      transactionHistory: transactions.slice(0, 12),
      planningHistory: planningHistory.slice(0, 20),
    };
  }

  private async optionalRequest<T>(path: string): Promise<T | null> {
    try {
      return await this.request<T>(path);
    } catch (error) {
      if (error instanceof TwentyCiApiError && [401, 403, 404, 422].includes(error.status)) {
        console.warn(`TwentyCI optional endpoint ${path} unavailable (${error.status})`);
        return null;
      }
      throw error;
    }
  }

  private async request<T>(path: string, init: RequestInit = {}, retryAuth = true): Promise<T> {
    const accessToken = await getAccessToken(this.config);
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (response.status === 401 && retryAuth) {
      tokenCache = null;
      return this.request<T>(path, init, false);
    }

    if (!response.ok) {
      throw new TwentyCiApiError(response.status, `TwentyCI request failed with status ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}

export class TwentyCiApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "TwentyCiApiError";
  }
}

export function getTwentyCiConfig(): TwentyConfig | null {
  const clientId = process.env.TWENTYCI_CLIENT_ID?.trim();
  const clientSecret = process.env.TWENTYCI_CLIENT_SECRET?.trim();
  const username = process.env.TWENTYCI_USERNAME?.trim();
  const password = process.env.TWENTYCI_PASSWORD?.trim();
  if (!clientId || !clientSecret || !username || !password) return null;
  return { clientId, clientSecret, username, password };
}

async function getAccessToken(config: TwentyConfig) {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs - 60_000 > now) return tokenCache.accessToken;

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    username: config.username,
    password: config.password,
    grant_type: "password",
    scope: "*",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new TwentyCiApiError(response.status, `TwentyCI OAuth failed with status ${response.status}`);

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("TwentyCI OAuth response did not include access_token");
  tokenCache = {
    accessToken: payload.access_token,
    expiresAtMs: now + Math.max(60, Number(payload.expires_in ?? 3600)) * 1000,
  };
  return tokenCache.accessToken;
}

function choosePropertyCandidate(rows: TwentyPropertyRow[], targetAddress: string, targetPostcode: string) {
  let best: { row: TwentyPropertyRow; score: number } | null = null;
  for (const row of rows) {
    const attributes = row.attributes ?? {};
    const candidateAddress = firstString(attributes.address1, attributes.address) ?? "";
    const candidatePostcode = normalisePostcode(firstString(attributes.postcode) ?? "");
    let score = candidatePostcode === targetPostcode ? 0.45 : 0;
    const target = normaliseAddress(targetAddress);
    const candidate = normaliseAddress(candidateAddress);
    if (target && candidate) {
      if (target === candidate) score += 0.55;
      else if (target.includes(candidate) || candidate.includes(target)) score += 0.48;
      else score += tokenSimilarity(target, candidate) * 0.45;
    }
    if (!best || score > best.score) best = { row, score: Math.min(1, score) };
  }
  return best;
}

function derivePropertyActivity(input: {
  latestTrigger: PropertyTrigger | null;
  latestTransaction: PropertyTransaction | null;
  likelyToSellPercentile: number | null;
}): { signal: PropertyActivitySignal; reasons: string[] } {
  const reasons: string[] = [];
  let signal: PropertyActivitySignal = "neutral";
  const triggerDays = daysSince(input.latestTrigger?.date ?? null);
  const transactionDays = daysSince(input.latestTransaction?.date ?? null);

  if (triggerDays !== null && triggerDays <= 30) {
    signal = "strong";
    reasons.push(`Recent property-market signal${input.latestTrigger?.type ? ` (${input.latestTrigger.type})` : ""} detected ${triggerDays} day${triggerDays === 1 ? "" : "s"} ago.`);
  } else if (triggerDays !== null && triggerDays <= 90) {
    signal = "positive";
    reasons.push(`Property-market activity detected within the last ${triggerDays} days.`);
  }

  if (transactionDays !== null && transactionDays <= 365) {
    if (signal === "neutral") signal = "positive";
    reasons.push(`A recorded property transaction is ${transactionDays} day${transactionDays === 1 ? "" : "s"} old.`);
  }

  if (input.likelyToSellPercentile !== null && input.likelyToSellPercentile <= 20) {
    reasons.push(`TwentyCI places the property in the top ${Math.round(input.likelyToSellPercentile)}% most likely to sell. Treat this as movement context, not proof of construction intent.`);
  }

  if (reasons.length === 0) reasons.push("No recent property-market activity signal was strong enough to change the commercial timing view.");
  return { signal, reasons };
}

function parseTriggers(payload: unknown): PropertyTrigger[] {
  return dataRows(payload)
    .map((row) => {
      const attrs = asRecord(row.attributes) ?? asRecord(row) ?? {};
      return {
        type: firstString(attrs.trigger_type, attrs.trigger, attrs.type) ?? "Property activity",
        date: parseDate(attrs.date ?? attrs.trigger_date ?? attrs.date_id),
        price: firstNumber(attrs.price),
        tenure: firstString(attrs.tenure),
      };
    })
    .filter((row) => row.date || row.type !== "Property activity")
    .sort((a, b) => dateNumber(b.date) - dateNumber(a.date));
}

function parseTransactions(payload: unknown): PropertyTransaction[] {
  return dataRows(payload)
    .map((row) => {
      const attrs = asRecord(row.attributes) ?? asRecord(row) ?? {};
      return { date: parseDate(attrs.date ?? attrs.transaction_date), price: firstNumber(attrs.price) };
    })
    .filter((row) => row.date || row.price !== null)
    .sort((a, b) => dateNumber(b.date) - dateNumber(a.date));
}

function parsePlanningHistory(payload: unknown): PropertyPlanningRecord[] {
  return dataRows(payload)
    .map((row) => ({
      planningId: String(row.planning_id ?? row.id ?? "").trim(),
      address: firstString(row.address),
      receivedDate: parseDate(row.received_date),
      decision: firstString(row.decision),
    }))
    .filter((row) => row.planningId || row.receivedDate || row.decision)
    .sort((a, b) => dateNumber(b.receivedDate) - dateNumber(a.receivedDate));
}

function dataRows(payload: unknown): Array<Record<string, unknown>> {
  const root = asRecord(payload);
  const data = root?.data;
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)));
  const record = asRecord(data);
  return record ? [record] : [];
}

function dataAttributes(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  return asRecord(data?.attributes);
}

function latestByDate<T extends { date: string | null }>(rows: T[]): T | null {
  return rows.length ? [...rows].sort((a, b) => dateNumber(b.date) - dateNumber(a.date))[0] : null;
}

function firstAddressLine(address: string) {
  const withoutPostcode = address
    .replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return withoutPostcode.split(",")[0]?.trim() ?? "";
}

function normalisePostcode(value: string) {
  const compact = value.toUpperCase().replace(/\s+/g, "").trim();
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function normaliseAddress(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function tokenSimilarity(a: string, b: string) {
  const aTokens = new Set(a.match(/[a-z]+|\d+/g) ?? []);
  const bTokens = new Set(b.match(/[a-z]+|\d+/g) ?? []);
  if (!aTokens.size || !bTokens.size) return 0;
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  return intersection / Math.max(aTokens.size, bTokens.size);
}

function parseDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function daysSince(value: string | null) {
  if (!value) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function dateNumber(value: string | null) {
  return value ? Date.parse(`${value}T00:00:00Z`) || 0 : 0;
}

function firstString(...values: unknown[]) {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function firstInteger(...values: unknown[]) {
  const value = firstNumber(...values);
  return value === null ? null : Math.round(value);
}

function firstBoolean(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
  }
  return null;
}

function findFirstNumber(value: unknown, keys: string[]): number | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const key of keys) {
    if (key in record) {
      const found = firstNumber(record[key]);
      if (found !== null) return found;
    }
  }
  for (const child of Object.values(record)) {
    if (!child || typeof child !== "object") continue;
    const found = findFirstNumber(child, keys);
    if (found !== null) return found;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
