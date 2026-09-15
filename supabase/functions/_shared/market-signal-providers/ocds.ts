import type { MarketSignalType, NormalizedMarketSignal } from "./types.ts";

type JsonRecord = Record<string, unknown>;

type DeliveryContext = {
  addresses: JsonRecord[];
  descriptions: string[];
};

export async function normalizeOcdsPackage(input: {
  source: string;
  payload: unknown;
  sourceBaseUrl: string;
  since?: string | null;
}): Promise<NormalizedMarketSignal[]> {
  const root = asRecord(input.payload);
  const releases = asArray(root.releases);
  const output: NormalizedMarketSignal[] = [];

  for (const item of releases) {
    const release = asRecord(item);
    const normalized = await normalizeRelease(input.source, release, input.sourceBaseUrl);
    if (!normalized) continue;
    if (input.since && normalized.publishedAt && Date.parse(normalized.publishedAt) < Date.parse(input.since)) continue;
    output.push(normalized);
  }
  return output;
}

async function normalizeRelease(source: string, release: JsonRecord, sourceBaseUrl: string): Promise<NormalizedMarketSignal | null> {
  const tender = asRecord(release.tender);
  const planning = asRecord(release.planning);
  const planningProject = asRecord(planning.project);
  const awards = asArray(release.awards).map(asRecord);
  const parties = asArray(release.parties).map(asRecord);
  const buyer = asRecord(release.buyer);
  const tags = asStringArray(release.tag);
  const signalType = detectSignalType(tags, tender, awards);
  if (!signalType) return null;

  const title = firstString(tender.title, planningProject.title, release.title, release.description) ?? "Public procurement opportunity";
  const summary = firstString(tender.description, planning.rationale, release.description);
  const publishedAt = firstString(release.date, release.publishedDate);
  const sourceUpdatedAt = publishedAt;
  const externalOcid = firstString(release.ocid);
  const sourceSignalId = firstString(release.id, externalOcid);
  if (!sourceSignalId) return null;

  const buyerParty = findParty(parties, firstString(buyer.id));
  const buyerName = firstString(buyer.name, buyerParty?.name);
  const buyerIdentifier = firstString(asRecord(buyerParty?.identifier).id, buyer.id);
  const supplierName = awards
    .flatMap((award) => asArray(award.suppliers).map(asRecord))
    .map((supplier) => firstString(supplier.name))
    .find(Boolean) ?? null;

  const tenderItems = asArray(tender.items).map(asRecord);
  const releaseItems = asArray(release.items).map(asRecord);
  const items = tenderItems.length ? tenderItems : releaseItems;
  const cpvCodes = collectCpvCodes(tender, items);

  // Territory ownership must follow the place where the work is delivered,
  // never the buyer's HQ. A council/NHS office postcode is still useful
  // relationship context, but it cannot assign a region-wide contract to a
  // postcode district that happens to contain the buyer's office.
  const delivery = collectDeliveryContext(release, tender, items);
  const deliveryPostcodes = unique(delivery.addresses.map((address) => firstString(address.postalCode)).filter(isString));
  const deliveryRegions = unique(
    delivery.addresses
      .flatMap((address) => [firstString(address.region), ...asStringArray(address.regionCode)])
      .filter(isString),
  );
  const postcodeDistrict = deliveryPostcodes.map(extractPostcodeDistrict).find(Boolean) ?? null;

  const buyerAddress = asRecord(buyerParty?.address);
  const buyerContext = [firstString(buyerAddress.locality), firstString(buyerAddress.region), firstString(buyerAddress.postalCode)].filter(isString);
  const deliveryText = unique([
    ...delivery.descriptions,
    ...delivery.addresses.flatMap((address) => [firstString(address.locality), firstString(address.region), firstString(address.postalCode)]).filter(isString),
  ]);
  const locationText = deliveryText.length > 0
    ? deliveryText.join(", ")
    : buyerContext.length > 0
      ? `Delivery location not stated; buyer based in ${buyerContext.join(", ")}`
      : null;
  const locationConfidence: NormalizedMarketSignal["locationConfidence"] = postcodeDistrict
    ? "exact_postcode"
    : deliveryText.length > 0
      ? "delivery_region"
      : buyerContext.length > 0
        ? "buyer_address"
        : "unresolved";

  const tenderValue = asRecord(tender.value);
  const planningBudget = asRecord(planning.budget);
  const awardValue = awards.map((award) => asRecord(award.value)).find((value) => toNumber(value.amount) !== null) ?? {};
  const amount = toNumber(tenderValue.amount) ?? toNumber(planningBudget.amount) ?? toNumber(awardValue.amount);
  const currency = firstString(tenderValue.currency, planningBudget.currency, awardValue.currency) ?? "GBP";
  const deadlineAt = firstString(asRecord(tender.tenderPeriod).endDate, asRecord(tender.enquiryPeriod).endDate);
  const contractPeriod = asRecord(tender.contractPeriod);
  const contractStartDate = dateOnly(firstString(contractPeriod.startDate));
  const contractEndDate = dateOnly(firstString(contractPeriod.endDate));
  const contact = extractContact(buyerParty);
  const procurementStage = signalType === "contract_award" ? "award" : signalType === "public_pipeline" ? "planning" : "tender";
  const noticeType = tags.join(",") || procurementStage;
  const sourceUrl = buildSourceUrl(source, sourceBaseUrl, firstString(release.id), externalOcid);
  const hashPayload = { title, summary, tags, amount, deadlineAt, buyerName, supplierName, deliveryPostcodes, deliveryRegions, cpvCodes };

  return {
    source,
    sourceSignalId,
    signalType,
    title,
    summary,
    locationText,
    postcodeDistrict,
    estimatedProjectValueLow: amount,
    estimatedProjectValueHigh: amount,
    sourceUrl,
    publishedAt,
    sourceUpdatedAt,
    contentHash: await sha256(JSON.stringify(hashPayload)),
    procurementStage,
    noticeType,
    externalOcid,
    buyerName,
    buyerIdentifier,
    supplierName,
    deadlineAt,
    contractStartDate,
    contractEndDate,
    cpvCodes,
    deliveryPostcodes,
    deliveryRegions,
    contact,
    valueCurrency: currency,
    locationConfidence,
    rawPayload: release,
  };
}

export function detectSignalType(tags: string[], tender: JsonRecord, awards: JsonRecord[]): MarketSignalType | null {
  const lowered = tags.map((tag) => tag.toLowerCase());
  if (lowered.includes("award") || awards.length > 0) return "contract_award";
  if (lowered.includes("planning") || String(tender.status ?? "").toLowerCase() === "planned") return "public_pipeline";
  if (lowered.includes("tender") || Object.keys(tender).length > 0) return "tender";
  return null;
}

function collectCpvCodes(tender: JsonRecord, items: JsonRecord[]): string[] {
  const codes: string[] = [];
  const tenderClassification = asRecord(tender.classification);
  if (String(tenderClassification.scheme ?? "").toUpperCase() === "CPV") {
    const code = firstString(tenderClassification.id);
    if (code) codes.push(code);
  }
  for (const item of items) {
    const classification = asRecord(item.classification);
    if (String(classification.scheme ?? "").toUpperCase() === "CPV") {
      const code = firstString(classification.id);
      if (code) codes.push(code);
    }
    for (const extra of asArray(item.additionalClassifications).map(asRecord)) {
      if (String(extra.scheme ?? "").toUpperCase() !== "CPV") continue;
      const code = firstString(extra.id);
      if (code) codes.push(code);
    }
  }
  return unique(codes);
}

function collectDeliveryContext(release: JsonRecord, tender: JsonRecord, items: JsonRecord[]): DeliveryContext {
  const addresses: JsonRecord[] = [];
  const descriptions: string[] = [];
  const pushAddress = (value: unknown) => {
    const address = asRecord(value);
    if (Object.keys(address).length) addresses.push(address);
  };
  const pushDescription = (value: unknown) => {
    const description = firstString(value);
    if (description) descriptions.push(description);
  };

  for (const item of items) {
    for (const address of asArray(item.deliveryAddresses)) pushAddress(address);
    const deliveryLocation = asRecord(item.deliveryLocation);
    pushAddress(deliveryLocation.address);
    pushDescription(deliveryLocation.description);
  }
  for (const address of asArray(tender.deliveryAddresses)) pushAddress(address);
  for (const address of asArray(release.deliveryAddresses)) pushAddress(address);
  for (const location of asArray(tender.deliveryLocations).map(asRecord)) {
    pushAddress(location.address);
    pushDescription(location.description);
  }
  return { addresses, descriptions: unique(descriptions) };
}

function extractContact(party?: JsonRecord): Record<string, unknown> {
  if (!party) return {};
  const contact = asRecord(party.contactPoint);
  const result: Record<string, unknown> = {};
  for (const key of ["name", "email", "telephone", "url"]) {
    const value = firstString(contact[key]);
    if (value) result[key] = value;
  }
  return result;
}

function findParty(parties: JsonRecord[], id: string | null): JsonRecord | undefined {
  if (!id) return undefined;
  return parties.find((party) => firstString(party.id) === id);
}

function buildSourceUrl(source: string, base: string, releaseId: string | null, ocid: string | null) {
  if (source === "find-a-tender" && releaseId) return `https://www.find-tender.service.gov.uk/Notice/${encodeURIComponent(releaseId)}`;
  if (source === "contracts-finder" && releaseId) return `https://www.contractsfinder.service.gov.uk/Notice/${encodeURIComponent(releaseId)}`;
  if (source === "sell2wales" && ocid) return `https://www.sell2wales.gov.wales/search/Search_MainPage.aspx?search=ocid:${encodeURIComponent(ocid)}`;
  if (source === "public-contracts-scotland" && ocid) return `https://www.publiccontractsscotland.gov.uk/search/show/search_view.aspx?ID=${encodeURIComponent(ocid)}`;
  return base;
}

export function extractPostcodeDistrict(postcode: string | null): string | null {
  if (!postcode) return null;
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, " ").replace(/\.$/, "");
  const match = normalized.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)(?:\s|\d|$)/);
  return match?.[1] ?? null;
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function asRecord(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function asArray(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function firstString(...values: unknown[]): string | null { for (const value of values) if (typeof value === "string" && value.trim()) return value.trim(); return null; }
function asStringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter(isString).map((item) => item.trim()).filter(Boolean) : typeof value === "string" ? [value] : []; }
function isString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function unique<T>(values: T[]): T[] { return Array.from(new Set(values)); }
function toNumber(value: unknown): number | null { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null; }
function dateOnly(value: string | null): string | null { return value ? value.slice(0, 10) : null; }
