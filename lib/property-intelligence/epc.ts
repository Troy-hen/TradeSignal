import "server-only";

const EPC_BASE_URL = "https://api.get-energy-performance-data.communities.gov.uk";

export type EpcIntelligenceSnapshot = {
  provider: "mhclg-epc";
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
  improvementSignals: string[];
  signalSummary: string;
  registrationDate: string | null;
};

type SearchResult = Record<string, unknown>;
type SearchResponse = { data?: SearchResult[]; pagination?: Record<string, unknown> };
type CertificateResponse = { data?: Record<string, unknown> };

export function isEpcIntelligenceConfigured() {
  return Boolean(process.env.EPC_API_BEARER_TOKEN?.trim());
}

export async function enrichWithEpc(input: { address: string; postcode: string }): Promise<EpcIntelligenceSnapshot | null> {
  const token = process.env.EPC_API_BEARER_TOKEN?.trim();
  if (!token) return null;

  const postcode = normalizePostcode(input.postcode);
  if (!postcode) return null;

  const searchUrl = new URL("/api/domestic/search", EPC_BASE_URL);
  searchUrl.searchParams.set("postcode", postcode);
  searchUrl.searchParams.set("page_size", "100");

  const search = await epcRequest<SearchResponse>(searchUrl, token, true);
  const candidates = Array.isArray(search?.data) ? search.data : [];
  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((candidate) => ({ candidate, score: addressMatchScore(input.address, candidate) }))
    .sort((a, b) => b.score - a.score || registrationTime(b.candidate) - registrationTime(a.candidate));
  const winner = ranked[0];
  if (!winner || winner.score < 0.52) return null;

  const certificateNumber = stringValue(winner.candidate, ["certificateNumber", "certificate_number"]);
  if (!certificateNumber) return null;

  const certificateUrl = new URL("/api/certificate", EPC_BASE_URL);
  certificateUrl.searchParams.set("certificate_number", certificateNumber);
  const certificateResponse = await epcRequest<CertificateResponse>(certificateUrl, token, false);
  const certificate = certificateResponse?.data ?? winner.candidate;

  const currentBand = upperBand(value(certificate, ["current_energy_efficiency_band", "currentEnergyEfficiencyBand", "current_energy_rating"]));
  const potentialBand = upperBand(value(certificate, ["potential_energy_efficiency_band", "potentialEnergyEfficiencyBand", "potential_energy_rating"]));
  const currentEfficiency = numberValue(certificate, ["current_energy_efficiency", "currentEnergyEfficiency", "current_energy_efficiency_score"]);
  const potentialEfficiency = numberValue(certificate, ["potential_energy_efficiency", "potentialEnergyEfficiency", "potential_energy_efficiency_score"]);
  const roofDescription = stringValue(certificate, ["roof_description", "roofDescription"]);
  const windowsDescription = stringValue(certificate, ["windows_description", "windowsDescription"]);
  const wallsDescription = stringValue(certificate, ["walls_description", "wallsDescription"]);
  const mainHeatingDescription = stringValue(certificate, ["main_heating_description", "mainheat_description", "mainHeatingDescription"]);
  const mainFuel = stringValue(certificate, ["main_fuel", "mainFuel"]);

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
  });

  const matchedAddress = joinedAddress(certificate) ?? joinedAddress(winner.candidate);
  const registrationDate = dateValue(certificate, ["registration_date", "registrationDate", "lodgement_date", "lodgementDate"]);

  return {
    provider: "mhclg-epc",
    certificateNumber,
    uprn: nullableString(value(certificate, ["uprn", "building_reference_number", "buildingReferenceNumber"])),
    matchedAddress,
    postcode: normalizePostcode(nullableString(value(certificate, ["postcode"])) ?? postcode),
    matchConfidence: Math.min(1, Math.max(0, winner.score)),
    currentBand,
    currentEfficiency,
    potentialBand,
    potentialEfficiency,
    propertyType: stringValue(certificate, ["property_type", "propertyType"]),
    builtForm: stringValue(certificate, ["built_form", "builtForm"]),
    floorArea: numberValue(certificate, ["total_floor_area", "totalFloorArea", "floor_area"]),
    constructionAgeBand: stringValue(certificate, ["construction_age_band", "constructionAgeBand"]),
    mainHeatingDescription,
    mainFuel,
    roofDescription,
    windowsDescription,
    wallsDescription,
    mainsGas: booleanValue(certificate, ["mains_gas_flag", "mainsGasFlag"]),
    solarWaterHeating: booleanValue(certificate, ["solar_water_heating_flag", "solarWaterHeatingFlag"]),
    improvementSignals,
    signalSummary: buildSignalSummary(currentBand, potentialBand, improvementSignals),
    registrationDate,
  };
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
}) {
  const signals: string[] = [];
  if (input.currentBand && ["D", "E", "F", "G"].includes(input.currentBand)) {
    signals.push(`Current EPC rating is ${input.currentBand}, indicating meaningful energy-efficiency headroom.`);
  }
  if (input.currentEfficiency !== null && input.potentialEfficiency !== null && input.potentialEfficiency - input.currentEfficiency >= 10) {
    signals.push(`The certificate shows ${input.potentialEfficiency - input.currentEfficiency} points of potential efficiency improvement.`);
  }
  if (containsAny(input.roofDescription, ["no insulation", "limited insulation", "poor", "very poor", "uninsulated"])) {
    signals.push("Roof/loft performance may make insulation-related work commercially relevant.");
  }
  if (containsAny(input.windowsDescription, ["single glazed", "single glazing", "partial double", "poor", "very poor"])) {
    signals.push("Window performance may make glazing or replacement-window work commercially relevant.");
  }
  if (containsAny(input.wallsDescription, ["no insulation", "uninsulated", "poor", "very poor"])) {
    signals.push("Wall performance indicates additional fabric-efficiency improvement potential.");
  }
  if (containsAny([input.mainHeatingDescription, input.mainFuel].filter(Boolean).join(" "), ["boiler", "gas", "oil", "lpg", "solid fuel"])) {
    signals.push("The recorded heating system uses conventional/fossil-fuel technology, useful context for heating or low-carbon upgrade conversations.");
  }
  return signals.slice(0, 6);
}

function buildSignalSummary(currentBand: string | null, potentialBand: string | null, signals: string[]) {
  const rating = currentBand ? `EPC ${currentBand}${potentialBand ? ` with potential to reach ${potentialBand}` : ""}.` : "An EPC record was matched to this property.";
  if (signals.length === 0) return `${rating} Treat this as supporting property context rather than evidence that a specific upgrade will be purchased.`;
  return `${rating} ${signals.length} energy-related ${signals.length === 1 ? "signal" : "signals"} may help qualify the opportunity. These are contextual indicators, not confirmed purchase intent.`;
}

function joinedAddress(record: SearchResult) {
  const direct = stringValue(record, ["address", "full_address", "fullAddress"]);
  if (direct) return direct;
  const parts = [
    stringValue(record, ["address_line_1", "addressLine1", "address1"]),
    stringValue(record, ["address_line_2", "addressLine2", "address2"]),
    stringValue(record, ["address_line_3", "addressLine3", "address3"]),
    stringValue(record, ["address_line_4", "addressLine4", "address4"]),
  ].filter((item): item is string => Boolean(item));
  return parts.length ? parts.join(", ") : null;
}

function registrationTime(record: SearchResult) {
  const date = dateValue(record, ["registrationDate", "registration_date", "lodgementDate", "lodgement_date"]);
  return date ? Date.parse(date) || 0 : 0;
}

function normalizeAddress(value: string) {
  return value.toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\b(flat|apartment|apt)\s+/g, "$1 ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|property|at|england|wales|uk|united kingdom)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePostcode(value: string | null) {
  if (!value) return null;
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length < 5 || compact.length > 7) return value.trim().toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function containsAny(value: string | null, needles: string[]) {
  const haystack = (value ?? "").toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function value(record: SearchResult, keys: string[]) {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key];
  return null;
}
function stringValue(record: SearchResult, keys: string[]) { return nullableString(value(record, keys)); }
function nullableString(input: unknown) { if (typeof input === "string" && input.trim()) return input.trim(); if (typeof input === "number" && Number.isFinite(input)) return String(input); return null; }
function numberValue(record: SearchResult, keys: string[]) { const raw = value(record, keys); if (raw === null || raw === "") return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; }
function dateValue(record: SearchResult, keys: string[]) { const raw = stringValue(record, keys); if (!raw) return null; const parsed = Date.parse(raw); return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null; }
function booleanValue(record: SearchResult, keys: string[]) { const raw = value(record, keys); if (typeof raw === "boolean") return raw; if (typeof raw === "number") return raw === 1 ? true : raw === 0 ? false : null; if (typeof raw !== "string") return null; const normalized = raw.trim().toLowerCase(); if (["y", "yes", "true", "1"].includes(normalized)) return true; if (["n", "no", "false", "0"].includes(normalized)) return false; return null; }
function upperBand(input: unknown) { const band = nullableString(input)?.toUpperCase() ?? null; return band && /^[A-G]$/.test(band) ? band : null; }
