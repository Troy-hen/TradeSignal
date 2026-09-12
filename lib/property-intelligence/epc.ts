import "server-only";

const EPC_BASE_URL = "https://api.get-energy-performance-data.communities.gov.uk";

export type EpcCertificateScope = "domestic" | "non_domestic" | "display";

export type EpcIntelligenceSnapshot = {
  provider: "mhclg-epc";
  certificateScope: EpcCertificateScope;
  certificateNumber: string;
  uprn: string | null;
  matchedAddress: string | null;
  postcode: string | null;
  matchConfidence: number;
  currentBand: string | null;
  currentEfficiency: number | null;
  potentialBand: string | null;
  potentialEfficiency: number | null;
  propertyType: string | null;
  builtForm: string | null;
  floorArea: number | null;
  constructionAgeBand: string | null;
  mainHeatingDescription: string | null;
  mainFuel: string | null;
  roofDescription: string | null;
  windowsDescription: string | null;
  wallsDescription: string | null;
  mainsGas: boolean | null;
  solarWaterHeating: boolean | null;
  energyMix: string | null;
  fuelSources: string[];
  hasHeatPump: boolean | null;
  hasSolarPv: boolean | null;
  renewableSources: string[];
  airConditioning: boolean | null;
  otherFuelDescription: string | null;
  energyConsumptionCurrent: number | null;
  co2EmissionsCurrent: number | null;
  improvementSignals: string[];
  signalSummary: string;
  registrationDate: string | null;
};

type SearchResult = Record<string, unknown>;
type SearchResponse = { data?: unknown; pagination?: Record<string, unknown> };
type CertificateResponse = { data?: Record<string, unknown> | Record<string, unknown>[] };
type ScopedCandidate = { candidate: SearchResult; scope: Exclude<EpcCertificateScope, "display">; score: number };
type SearchQuery = { postcode?: string | null; uprn?: string | null; address?: string | null };

export function isEpcIntelligenceConfigured() {
  return Boolean(getBearerToken());
}

/**
 * Match order deliberately favours a source UPRN when the planning provider has
 * supplied one. The official EPC API accepts UPRN, postcode and address search.
 * If there is no UPRN match we search both domestic and non-domestic datasets by
 * postcode, then fall back to address search before declaring a genuine no-match.
 */
export async function enrichWithEpc(input: { address: string; postcode: string; uprn?: string | null; projectContext?: string | null }): Promise<EpcIntelligenceSnapshot | null> {
  const token = getBearerToken();
  if (!token) return null;

  const postcode = normalizePostcode(input.postcode);
  if (!postcode) return null;
  const uprn = normalizeUprn(input.uprn ?? null);
  const preference = inferScopePreference(input.projectContext ?? "");

  let candidates: ScopedCandidate[] = [];

  if (uprn) {
    const [domesticByUprn, nonDomesticByUprn] = await Promise.all([
      searchCertificates("domestic", { uprn }, token),
      searchCertificates("non-domestic", { uprn }, token),
    ]);
    candidates = rankCandidates(input.address, preference, domesticByUprn, nonDomesticByUprn, true);
  }

  if (candidates.length === 0) {
    const [domestic, nonDomestic] = await Promise.all([
      searchCertificates("domestic", { postcode }, token),
      searchCertificates("non-domestic", { postcode }, token),
    ]);
    candidates = rankCandidates(input.address, preference, domestic, nonDomestic, false);
  }

  let winner = candidates[0];

  // Some planning feeds format premises differently from the EPC register. If a
  // postcode search returned nothing sufficiently close, let the API's own
  // address index provide a second candidate set rather than silently failing.
  if (!winner || winner.score < 0.52) {
    const address = addressForSearch(input.address, postcode);
    if (address) {
      const [domesticByAddress, nonDomesticByAddress] = await Promise.all([
        searchCertificates("domestic", { address }, token),
        searchCertificates("non-domestic", { address }, token),
      ]);
      const addressCandidates = rankCandidates(input.address, preference, domesticByAddress, nonDomesticByAddress, false);
      if (!winner || (addressCandidates[0]?.score ?? -1) > winner.score) winner = addressCandidates[0];
    }
  }

  if (!winner || winner.score < 0.52) return null;

  const certificateNumber = firstDeepString(winner.candidate, ["certificate_number", "certificateNumber", "lmk_key", "lmkKey"]);
  if (!certificateNumber) return null;

  const certificateUrl = new URL("/api/certificate", EPC_BASE_URL);
  certificateUrl.searchParams.set("certificate_number", certificateNumber);
  const certificateResponse = await epcRequest<CertificateResponse>(certificateUrl, token, false);
  const certificate = normalizeCertificateData(certificateResponse?.data) ?? winner.candidate;

  const currentBand = upperBand(firstDeepValue(certificate, [
    "current_energy_efficiency_band", "currentEnergyEfficiencyBand", "current_energy_rating", "asset_rating_band", "assetRatingBand", "energy_rating",
  ]));
  const potentialBand = upperBand(firstDeepValue(certificate, [
    "potential_energy_efficiency_band", "potentialEnergyEfficiencyBand", "potential_energy_rating", "potential_asset_rating_band", "potentialAssetRatingBand",
  ]));
  const currentEfficiency = firstDeepNumber(certificate, [
    "current_energy_efficiency", "currentEnergyEfficiency", "current_energy_efficiency_score", "asset_rating", "assetRating",
  ]);
  const potentialEfficiency = firstDeepNumber(certificate, [
    "potential_energy_efficiency", "potentialEnergyEfficiency", "potential_energy_efficiency_score", "potential_asset_rating", "potentialAssetRating",
  ]);
  const roofDescription = firstDeepString(certificate, ["roof_description", "roofDescription", "roof"]);
  const windowsDescription = firstDeepString(certificate, ["windows_description", "windowsDescription", "windows"]);
  const wallsDescription = firstDeepString(certificate, ["walls_description", "wallsDescription", "walls"]);
  const mainHeatingDescription = firstDeepString(certificate, [
    "main_heating_description", "mainheat_description", "mainHeatingDescription", "main_heating", "mainHeating", "heating_system", "heatingSystem",
  ]);
  const mainFuel = firstDeepString(certificate, ["main_fuel", "mainFuel", "main_heating_fuel", "mainHeatingFuel"]);
  const otherFuelDescription = firstDeepString(certificate, ["other_fuel_description", "otherFuelDescription"]);
  const mainsGas = firstDeepBoolean(certificate, ["mains_gas_flag", "mainsGasFlag", "mains_gas", "mainsGas"]);
  const solarWaterHeating = firstDeepBoolean(certificate, ["solar_water_heating_flag", "solarWaterHeatingFlag", "solar_water_heating", "solarWaterHeating"]);
  const airConditioning = firstDeepBoolean(certificate, ["ac_present", "acPresent", "air_conditioning", "airConditioning"]);

  const energyEvidence = collectEnergyEvidence(certificate, { mainFuel, mainHeatingDescription, otherFuelDescription, mainsGas });
  const hasHeatPump = detectHeatPump(energyEvidence.textEvidence);
  const hasSolarPv = detectSolarPv(certificate, energyEvidence.textEvidence);
  const renewableSources = normalizeRenewables(certificate, energyEvidence.textEvidence, hasHeatPump, hasSolarPv, solarWaterHeating);
  const fuelSources = normalizeFuelSources(energyEvidence.textEvidence, mainsGas, hasHeatPump);
  const energyMix = buildEnergyMix(fuelSources, renewableSources);

  const propertyType = firstDeepString(certificate, [
    "property_type", "propertyType", "building_type", "buildingType", "building_use", "buildingUse", "main_activity", "mainActivity",
  ]);
  const builtForm = firstDeepString(certificate, ["built_form", "builtForm", "building_environment", "buildingEnvironment"]);
  const floorArea = firstDeepNumber(certificate, ["total_floor_area", "totalFloorArea", "floor_area", "floorArea"]);
  const constructionAgeBand = firstDeepString(certificate, ["construction_age_band", "constructionAgeBand", "construction_age", "constructionAge"]);
  const energyConsumptionCurrent = firstDeepNumber(certificate, [
    "energy_consumption_current", "energyConsumptionCurrent", "primary_energy_use", "primaryEnergyUse", "annual_energy_use", "annualEnergyUse",
  ]);
  const co2EmissionsCurrent = firstDeepNumber(certificate, [
    "co2_emissions_current", "co2EmissionsCurrent", "co2_emissions", "co2Emissions", "co2_emission_rating", "co2EmissionRating",
  ]);

  const improvementSignals = deriveImprovementSignals({
    currentBand,
    currentEfficiency,
    potentialBand,
    potentialEfficiency,
    roofDescription,
    windowsDescription,
    wallsDescription,
    mainHeatingDescription,
    mainFuel,
    fuelSources,
    hasHeatPump,
    hasSolarPv,
    airConditioning,
    certificateScope: winner.scope,
  });

  const matchedAddress = joinedAddress(certificate) ?? joinedAddress(winner.candidate);
  const registrationDate = firstDeepDate(certificate, ["registration_date", "registrationDate", "lodgement_date", "lodgementDate"]);

  return {
    provider: "mhclg-epc",
    certificateScope: winner.scope,
    certificateNumber,
    uprn: firstDeepString(certificate, ["uprn", "building_reference_number", "buildingReferenceNumber"]),
    matchedAddress,
    postcode: normalizePostcode(firstDeepString(certificate, ["postcode"]) ?? postcode),
    matchConfidence: Math.min(1, Math.max(0, winner.score)),
    currentBand,
    currentEfficiency,
    potentialBand,
    potentialEfficiency,
    propertyType,
    builtForm,
    floorArea,
    constructionAgeBand,
    mainHeatingDescription,
    mainFuel,
    roofDescription,
    windowsDescription,
    wallsDescription,
    mainsGas,
    solarWaterHeating,
    energyMix,
    fuelSources,
    hasHeatPump,
    hasSolarPv,
    renewableSources,
    airConditioning,
    otherFuelDescription,
    energyConsumptionCurrent,
    co2EmissionsCurrent,
    improvementSignals,
    signalSummary: buildSignalSummary(currentBand, potentialBand, improvementSignals, energyMix, winner.scope),
    registrationDate,
  };
}

function rankCandidates(address: string, preference: ReturnType<typeof inferScopePreference>, domestic: SearchResult[], nonDomestic: SearchResult[], exactUprn: boolean): ScopedCandidate[] {
  return [
    ...domestic.map((candidate) => ({ candidate, scope: "domestic" as const, score: exactUprn ? 1 : addressMatchScore(address, candidate) + scopeBonus("domestic", preference) })),
    ...nonDomestic.map((candidate) => ({ candidate, scope: "non_domestic" as const, score: exactUprn ? 1 : addressMatchScore(address, candidate) + scopeBonus("non_domestic", preference) })),
  ].sort((a, b) => b.score - a.score || registrationTime(b.candidate) - registrationTime(a.candidate));
}

async function searchCertificates(scope: "domestic" | "non-domestic", query: SearchQuery, token: string): Promise<SearchResult[]> {
  const searchUrl = new URL(`/api/${scope}/search`, EPC_BASE_URL);
  if (query.postcode) searchUrl.searchParams.set("postcode", query.postcode);
  if (query.uprn) searchUrl.searchParams.set("uprn", query.uprn);
  if (query.address) searchUrl.searchParams.set("address", query.address);
  searchUrl.searchParams.set("page_size", "100");
  try {
    const search = await epcRequest<SearchResponse>(searchUrl, token, true);
    return normalizeSearchData(search?.data);
  } catch (error) {
    if (error instanceof Error && ["EPC_API_AUTH_FAILED", "EPC_API_RATE_LIMITED"].includes(error.message)) throw error;
    console.warn(`EPC ${scope} search unavailable`, error);
    return [];
  }
}

async function epcRequest<T>(url: URL, token: string, allowNotFound: boolean): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (response.status === 404 && allowNotFound) return null;
    if (response.status === 401 || response.status === 403) throw new Error("EPC_API_AUTH_FAILED");
    if (response.status === 429) throw new Error("EPC_API_RATE_LIMITED");
    if (!response.ok) throw new Error(`EPC_API_HTTP_${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

function getBearerToken() {
  const raw = process.env.EPC_API_BEARER_TOKEN?.trim();
  if (!raw) return null;
  // Accept either the raw token copied from GOV.UK or a value pasted with the
  // human-readable "Bearer " prefix; the request builder adds the prefix once.
  return raw.replace(/^Bearer\s+/i, "").trim() || null;
}

function normalizeSearchData(data: unknown): SearchResult[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];
  for (const key of ["certificates", "results", "items", "data"]) {
    const value = data[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return [];
}

function addressMatchScore(inputAddress: string, candidate: SearchResult) {
  const target = normalizeAddress(inputAddress);
  const candidateAddress = normalizeAddress(joinedAddress(candidate) ?? "");
  if (!target || !candidateAddress) return 0;

  const targetTokens = new Set(target.split(" ").filter(Boolean));
  const candidateTokens = new Set(candidateAddress.split(" ").filter(Boolean));
  const intersection = [...targetTokens].filter((token) => candidateTokens.has(token)).length;
  const union = new Set([...targetTokens, ...candidateTokens]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  const targetNumber = target.match(/\b\d+[a-z]?\b/)?.[0] ?? null;
  const candidateNumber = candidateAddress.match(/\b\d+[a-z]?\b/)?.[0] ?? null;
  const numberScore = targetNumber && candidateNumber ? (targetNumber === candidateNumber ? 0.38 : -0.28) : 0;
  const containsScore = target.includes(candidateAddress) || candidateAddress.includes(target) ? 0.16 : 0;

  return Math.min(1, Math.max(0, jaccard * 0.7 + numberScore + containsScore));
}

function inferScopePreference(context: string): "domestic" | "non_domestic" | null {
  const normalized = context.toLowerCase();
  if (/\b(shop|retail|office|commercial|industrial|warehouse|restaurant|cafe|pub|hotel|school|nursery|clinic|workplace|business premises|fit[- ]?out|shopfitting|shop fitting)\b/.test(normalized)) return "non_domestic";
  if (/\b(house|dwelling|bungalow|flat|apartment|home|residential extension|loft conversion)\b/.test(normalized)) return "domestic";
  return null;
}
function scopeBonus(scope: Exclude<EpcCertificateScope, "display">, preference: ReturnType<typeof inferScopePreference>) {
  if (!preference) return 0;
  return scope === preference ? 0.06 : 0;
}

function collectEnergyEvidence(certificate: SearchResult, supplied: { mainFuel: string | null; mainHeatingDescription: string | null; otherFuelDescription: string | null; mainsGas: boolean | null }) {
  const keys = [
    "main_fuel", "mainFuel", "main_heating_fuel", "mainHeatingFuel", "fuel_type", "fuelType", "heat_source", "heatSource",
    "energy_source", "energySource", "other_fuel_description", "otherFuelDescription", "main_heating_description", "mainHeatingDescription",
    "renewable_sources", "renewableSources", "lzc_energy_sources", "lzcEnergySources", "heating_system", "heatingSystem",
  ];
  const values = deepValues(certificate, keys).flatMap(toMeaningfulStrings);
  for (const value of [supplied.mainFuel, supplied.mainHeatingDescription, supplied.otherFuelDescription]) if (value) values.push(value);
  if (supplied.mainsGas === true) values.push("mains gas");
  return { textEvidence: [...new Set(values.map((item) => item.trim()).filter(Boolean))] };
}

function normalizeFuelSources(evidence: string[], mainsGas: boolean | null, hasHeatPump: boolean | null) {
  const text = evidence.join(" | ").toLowerCase();
  const fuels = new Set<string>();
  if (/\b(electric|electricity|electrical|grid electricity)\b/.test(text) || hasHeatPump === true) fuels.add("electricity");
  if (mainsGas === true || /\b(mains gas|natural gas|gas boiler|gas-fired|gas fired)\b/.test(text)) fuels.add("mains_gas");
  if (/\b(oil|kerosene|oil-fired|oil fired)\b/.test(text)) fuels.add("oil");
  if (/\b(lpg|liquefied petroleum gas)\b/.test(text)) fuels.add("lpg");
  if (/\b(biomass|wood pellet|wood chip)\b/.test(text)) fuels.add("biomass");
  if (/\b(coal|solid fuel)\b/.test(text)) fuels.add("solid_fuel");
  if (/\b(district heat|district heating|community heating|heat network)\b/.test(text)) fuels.add("district_heat");
  return [...fuels];
}

function detectHeatPump(evidence: string[]): boolean | null {
  const text = evidence.join(" | ").toLowerCase();
  if (/\b(heat pump|air source heat pump|ground source heat pump|water source heat pump|ashp|gshp)\b/.test(text)) return true;
  return text ? false : null;
}

function detectSolarPv(certificate: SearchResult, evidence: string[]): boolean | null {
  const text = evidence.join(" | ").toLowerCase();
  if (/\b(photovoltaic|solar pv|pv array|pv panels?)\b/.test(text)) return true;
  const pvValues = deepValues(certificate, ["photovoltaic_supply", "photovoltaicSupply", "photovoltaics", "solar_pv", "solarPv"]);
  if (pvValues.some(hasPositiveOrTrueValue)) return true;
  return pvValues.length > 0 || text ? false : null;
}

function normalizeRenewables(certificate: SearchResult, evidence: string[], heatPump: boolean | null, solarPv: boolean | null, solarWaterHeating: boolean | null) {
  const text = [
    ...evidence,
    ...deepValues(certificate, ["renewable_sources", "renewableSources", "lzc_energy_sources", "lzcEnergySources"]).flatMap(toMeaningfulStrings),
  ].join(" | ").toLowerCase();
  const sources = new Set<string>();
  if (solarPv === true) sources.add("solar_pv");
  if (solarWaterHeating === true || /\b(solar thermal|solar water heating)\b/.test(text)) sources.add("solar_thermal");
  if (heatPump === true) sources.add("heat_pump");
  if (/\b(biomass|wood pellet|wood chip)\b/.test(text)) sources.add("biomass");
  if (/\b(wind turbine|wind generation)\b/.test(text)) sources.add("wind");
  return [...sources];
}

function buildEnergyMix(fuels: string[], renewables: string[]) {
  const labels = fuels.map((fuel) => ({
    electricity: "Electric",
    mains_gas: "gas",
    oil: "oil",
    lpg: "LPG",
    biomass: "biomass",
    solid_fuel: "solid fuel",
    district_heat: "district heat",
  }[fuel] ?? fuel));
  if (labels.length === 1 && fuels[0] === "electricity" && renewables.length === 0) return "Electric only";
  if (labels.length === 0 && renewables.length === 0) return null;
  const renewableLabels = renewables.map((source) => ({ solar_pv: "solar PV", solar_thermal: "solar thermal", heat_pump: "heat pump", biomass: "biomass", wind: "wind" }[source] ?? source));
  return [...labels, ...renewableLabels.filter((item) => !labels.some((label) => label.toLowerCase() === item.toLowerCase()))].join(" + ");
}

function deriveImprovementSignals(input: {
  currentBand: string | null;
  currentEfficiency: number | null;
  potentialBand: string | null;
  potentialEfficiency: number | null;
  roofDescription: string | null;
  windowsDescription: string | null;
  wallsDescription: string | null;
  mainHeatingDescription: string | null;
  mainFuel: string | null;
  fuelSources: string[];
  hasHeatPump: boolean | null;
  hasSolarPv: boolean | null;
  airConditioning: boolean | null;
  certificateScope: EpcCertificateScope;
}) {
  const signals: string[] = [];
  if (input.currentBand && ["D", "E", "F", "G"].includes(input.currentBand)) signals.push(`Current EPC rating is ${input.currentBand}, indicating meaningful energy-efficiency headroom.`);
  if (input.certificateScope === "domestic" && input.currentEfficiency !== null && input.potentialEfficiency !== null && input.potentialEfficiency - input.currentEfficiency >= 10) signals.push(`The certificate shows ${input.potentialEfficiency - input.currentEfficiency} points of potential efficiency improvement.`);
  if (containsAny(input.roofDescription, ["no insulation", "limited insulation", "poor", "very poor", "uninsulated"])) signals.push("Roof/loft performance may make insulation-related work commercially relevant.");
  if (containsAny(input.windowsDescription, ["single glazed", "single glazing", "partial double", "poor", "very poor"])) signals.push("Window performance may make glazing or replacement-window work commercially relevant.");
  if (containsAny(input.wallsDescription, ["no insulation", "uninsulated", "poor", "very poor"])) signals.push("Wall performance indicates additional fabric-efficiency improvement potential.");
  if (input.fuelSources.some((fuel) => ["mains_gas", "oil", "lpg", "solid_fuel"].includes(fuel)) && input.hasHeatPump !== true) signals.push("The recorded heating/fuel mix includes conventional or fossil fuel, useful context for low-carbon heating work.");
  if (input.hasSolarPv === true) signals.push("Solar PV is recorded at the premises, useful context for electrical, battery-storage or wider renewables work.");
  if (input.certificateScope === "non_domestic" && input.airConditioning === true) signals.push("Air conditioning is recorded, adding useful building-services context for commercial refurbishment or M&E work.");
  return signals.slice(0, 7);
}

function buildSignalSummary(currentBand: string | null, potentialBand: string | null, signals: string[], energyMix: string | null, scope: EpcCertificateScope) {
  const label = scope === "non_domestic" ? "non-domestic EPC" : "EPC";
  const rating = currentBand ? `${label} ${currentBand}${potentialBand ? ` with potential to reach ${potentialBand}` : ""}.` : `A ${label} record was matched to this premises.`;
  const mix = energyMix ? ` Recorded energy/heating mix: ${energyMix}.` : "";
  if (signals.length === 0) return `${rating}${mix} Treat this as supporting building context rather than evidence that a specific upgrade will be purchased.`;
  return `${rating}${mix} ${signals.length} energy-related ${signals.length === 1 ? "signal" : "signals"} may help qualify the opportunity. These are contextual indicators, not confirmed purchase intent.`;
}

function joinedAddress(record: SearchResult) {
  const direct = firstDeepString(record, ["address", "full_address", "fullAddress"]);
  if (direct) return direct;
  const parts = [
    firstDeepString(record, ["address_line_1", "addressLine1", "address1"]),
    firstDeepString(record, ["address_line_2", "addressLine2", "address2"]),
    firstDeepString(record, ["address_line_3", "addressLine3", "address3"]),
    firstDeepString(record, ["address_line_4", "addressLine4", "address4"]),
  ].filter((item): item is string => Boolean(item));
  return parts.length ? parts.join(", ") : null;
}

function registrationTime(record: SearchResult) {
  const date = firstDeepDate(record, ["registrationDate", "registration_date", "lodgementDate", "lodgement_date"]);
  return date ? Date.parse(date) || 0 : 0;
}

function normalizeCertificateData(data: CertificateResponse["data"]): SearchResult | null {
  if (Array.isArray(data)) return isRecord(data[0]) ? data[0] : null;
  return isRecord(data) ? data : null;
}

function addressForSearch(value: string, postcode: string) {
  const compactPostcode = postcode.replace(/\s+/g, "");
  return value.replace(new RegExp(postcode.replace(/\s+/g, "\\s*"), "ig"), " ").replace(new RegExp(compactPostcode, "ig"), " ").replace(/\s+/g, " ").trim();
}

function normalizeAddress(value: string) {
  return value.toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|property|at|england|wales|uk|united kingdom)\b/g, " ")
    .replace(/\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePostcode(value: string | null) {
  if (!value) return null;
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length < 5 || compact.length > 7) return value.trim().toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function normalizeUprn(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits || digits.length > 12) return null;
  return digits.padStart(12, "0");
}

function containsAny(value: string | null, needles: string[]) { const haystack = (value ?? "").toLowerCase(); return needles.some((needle) => haystack.includes(needle)); }
function normalizeKey(key: string) { return key.replace(/[^a-z0-9]/gi, "").toLowerCase(); }
function deepValues(root: unknown, keys: string[]) {
  const wanted = new Set(keys.map(normalizeKey));
  const found: unknown[] = [];
  const seen = new Set<object>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (seen.has(value as object)) return;
    seen.add(value as object);
    if (Array.isArray(value)) { value.forEach(visit); return; }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (wanted.has(normalizeKey(key)) && child !== null && child !== undefined) found.push(child);
      if (child && typeof child === "object") visit(child);
    }
  };
  visit(root);
  return found;
}
function firstDeepValue(record: SearchResult, keys: string[]) { return deepValues(record, keys)[0] ?? null; }
function firstDeepString(record: SearchResult, keys: string[]) { for (const item of deepValues(record, keys)) { const value = nullableString(item); if (value) return value; } return null; }
function firstDeepNumber(record: SearchResult, keys: string[]) { for (const raw of deepValues(record, keys)) { if (raw === null || raw === "") continue; const parsed = Number(raw); if (Number.isFinite(parsed)) return parsed; } return null; }
function firstDeepDate(record: SearchResult, keys: string[]) { const raw = firstDeepString(record, keys); if (!raw) return null; const parsed = Date.parse(raw); return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null; }
function firstDeepBoolean(record: SearchResult, keys: string[]) { for (const raw of deepValues(record, keys)) { const parsed = toBoolean(raw); if (parsed !== null) return parsed; } return null; }
function toBoolean(raw: unknown) { if (typeof raw === "boolean") return raw; if (typeof raw === "number") return raw === 1 ? true : raw === 0 ? false : null; if (typeof raw !== "string") return null; const normalized = raw.trim().toLowerCase(); if (["y", "yes", "true", "1", "present", "installed"].includes(normalized)) return true; if (["n", "no", "false", "0", "not present", "none"].includes(normalized)) return false; return null; }
function nullableString(input: unknown) { if (typeof input === "string" && input.trim()) return input.trim(); if (typeof input === "number" && Number.isFinite(input)) return String(input); return null; }
function upperBand(input: unknown) { const band = nullableString(input)?.toUpperCase() ?? null; return band && /^[A-G]$/.test(band) ? band : null; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function toMeaningfulStrings(value: unknown): string[] { if (typeof value === "string" && value.trim()) return [value.trim()]; if (typeof value === "number" && Number.isFinite(value)) return [String(value)]; if (Array.isArray(value)) return value.flatMap(toMeaningfulStrings); if (isRecord(value)) return Object.values(value).flatMap(toMeaningfulStrings); return []; }
function hasPositiveOrTrueValue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const bool = toBoolean(value);
    if (bool !== null) return bool;
    const number = Number(value);
    if (Number.isFinite(number)) return number > 0;
    return /\b(installed|photovoltaic|solar pv|pv panel)\b/i.test(value);
  }
  if (Array.isArray(value)) return value.some(hasPositiveOrTrueValue);
  if (isRecord(value)) return Object.values(value).some(hasPositiveOrTrueValue);
  return false;
}
