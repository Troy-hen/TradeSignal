import type { RawApplication } from "../types.ts";

/**
 * Mirrors exactly the postcode_districts rows seeded in
 * supabase/migrations/20260907161300_seed_reference_data.sql — so a
 * generated application's district always resolves in the Territory
 * Explorer / claim flow instead of landing somewhere reserve_territory()
 * would reject as unknown.
 */
const DISTRICTS: { code: string; postTown: string; lat: number | null; lng: number | null }[] = [
  { code: "NR1", postTown: "Norwich", lat: 52.628, lng: 1.2974 },
  { code: "NR2", postTown: "Norwich", lat: 52.627, lng: 1.28 },
  { code: "NR3", postTown: "Norwich", lat: null, lng: null },
  { code: "NR4", postTown: "Norwich", lat: null, lng: null },
  { code: "NR14", postTown: "Norwich", lat: null, lng: null },
  { code: "NR15", postTown: "Norwich", lat: 52.51, lng: 1.38 },
  { code: "NR16", postTown: "Norwich", lat: null, lng: null },
  { code: "IP1", postTown: "Ipswich", lat: 52.059, lng: 1.156 },
  { code: "IP4", postTown: "Ipswich", lat: null, lng: null },
  { code: "IP22", postTown: "Diss", lat: 52.379, lng: 1.108 },
  { code: "IP24", postTown: "Thetford", lat: 52.414, lng: 0.748 },
  { code: "IP32", postTown: "Bury St Edmunds", lat: null, lng: null },
  { code: "CB1", postTown: "Cambridge", lat: null, lng: null },
  { code: "CB4", postTown: "Cambridge", lat: null, lng: null },
  { code: "CO1", postTown: "Colchester", lat: null, lng: null },
  { code: "CO10", postTown: "Sudbury", lat: null, lng: null },
  { code: "E1", postTown: "London", lat: 51.515, lng: -0.0648 },
  { code: "N1", postTown: "London", lat: null, lng: null },
  { code: "SW11", postTown: "London", lat: 51.465, lng: -0.167 },
  { code: "SE15", postTown: "London", lat: null, lng: null },
  { code: "W4", postTown: "London", lat: null, lng: null },
  { code: "EN5", postTown: "Barnet", lat: null, lng: null },
  { code: "RM1", postTown: "Romford", lat: null, lng: null },
  { code: "BR1", postTown: "Bromley", lat: null, lng: null },
  { code: "B1", postTown: "Birmingham", lat: 52.4862, lng: -1.9026 },
  { code: "B29", postTown: "Birmingham", lat: null, lng: null },
  { code: "CV1", postTown: "Coventry", lat: null, lng: null },
  { code: "WS1", postTown: "Walsall", lat: null, lng: null },
  { code: "M1", postTown: "Manchester", lat: 53.4808, lng: -2.2426 },
  { code: "M20", postTown: "Manchester", lat: null, lng: null },
  { code: "L1", postTown: "Liverpool", lat: 53.4084, lng: -2.9916 },
  { code: "PR1", postTown: "Preston", lat: null, lng: null },
  { code: "LS1", postTown: "Leeds", lat: 53.7997, lng: -1.5491 },
  { code: "LS10", postTown: "Leeds", lat: null, lng: null },
  { code: "S1", postTown: "Sheffield", lat: null, lng: null },
  { code: "HU1", postTown: "Hull", lat: null, lng: null },
  { code: "NE1", postTown: "Newcastle upon Tyne", lat: null, lng: null },
  { code: "BS1", postTown: "Bristol", lat: 51.4545, lng: -2.5879 },
  { code: "BS15", postTown: "Bristol", lat: null, lng: null },
  { code: "EX1", postTown: "Exeter", lat: null, lng: null },
  { code: "PL1", postTown: "Plymouth", lat: null, lng: null },
  { code: "BA1", postTown: "Bath", lat: null, lng: null },
  { code: "OX1", postTown: "Oxford", lat: null, lng: null },
  { code: "RG1", postTown: "Reading", lat: null, lng: null },
  { code: "GU1", postTown: "Guildford", lat: null, lng: null },
  { code: "BN1", postTown: "Brighton", lat: null, lng: null },
  { code: "ME1", postTown: "Rochester", lat: null, lng: null },
  { code: "CT1", postTown: "Canterbury", lat: null, lng: null },
  { code: "SO14", postTown: "Southampton", lat: null, lng: null },
  { code: "PO1", postTown: "Portsmouth", lat: null, lng: null },
  { code: "LE1", postTown: "Leicester", lat: null, lng: null },
  { code: "NG1", postTown: "Nottingham", lat: null, lng: null },
  { code: "DE1", postTown: "Derby", lat: null, lng: null },
  { code: "NN1", postTown: "Northampton", lat: null, lng: null },
  { code: "EH1", postTown: "Edinburgh", lat: 55.9533, lng: -3.1883 },
  { code: "G1", postTown: "Glasgow", lat: 55.8642, lng: -4.2518 },
  { code: "CF10", postTown: "Cardiff", lat: 51.4816, lng: -3.1791 },
  { code: "SA1", postTown: "Swansea", lat: null, lng: null },
  { code: "BT1", postTown: "Belfast", lat: 54.5973, lng: -5.9301 },
];

interface ProposalTemplate {
  description: string;
  applicationType: string;
  scale: "small" | "medium" | "large";
  isCommercial: boolean;
  /** [0, 0] means "doesn't create dwellings" -> dwelling_count stays null. */
  dwellingRange: [number, number];
}

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  { description: "Two-storey rear extension with associated internal alterations", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Single-storey side and rear extension to existing dwelling", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Loft conversion with rear dormer and installation of rooflights", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Erection of detached double garage and formation of new vehicular access", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Erection of single-storey rear extension and conversion of garage to habitable room", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Replacement of existing conservatory with single-storey rear extension", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Erection of rear dormer extension and 2no. rooflights to front roof slope", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Installation of solar photovoltaic panels to roof slopes", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Installation of ground source heat pump and associated plant", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Formation of vehicular crossover and construction of new driveway", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Re-roofing works and replacement of existing windows and doors", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Installation of new boundary treatment and landscaping works", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Erection of part single, part two-storey rear extension", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Erection of first floor extension above existing garage", applicationType: "Householder", scale: "small", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Two-storey side extension and single-storey rear extension with internal alterations", applicationType: "Householder", scale: "medium", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Erection of two-storey extension to side and rear with new pitched roof", applicationType: "Full Planning Permission", scale: "medium", isCommercial: false, dwellingRange: [0, 0] },
  { description: "Demolition of existing garage and erection of 4no. dwellings with associated parking and landscaping", applicationType: "Full Planning Permission (Major)", scale: "large", isCommercial: false, dwellingRange: [4, 4] },
  { description: "Construction of 12no. residential dwellings with associated access, parking and landscaping", applicationType: "Full Planning Permission (Major)", scale: "large", isCommercial: false, dwellingRange: [12, 12] },
  { description: "Demolition of existing outbuildings and erection of 2no. semi-detached dwellings", applicationType: "Full Planning Permission", scale: "medium", isCommercial: false, dwellingRange: [2, 2] },
  { description: "Change of use of ground floor from retail (Use Class E) to restaurant (Use Class E) with extraction flue", applicationType: "Change of Use", scale: "medium", isCommercial: true, dwellingRange: [0, 0] },
  { description: "Construction of new industrial unit with associated yard and parking", applicationType: "Full Planning Permission (Major)", scale: "large", isCommercial: true, dwellingRange: [0, 0] },
  { description: "Erection of 8no. apartments with associated parking and amenity space", applicationType: "Full Planning Permission (Major)", scale: "large", isCommercial: false, dwellingRange: [8, 8] },
  { description: "Change of use from agricultural building to 3no. residential dwellings (Class Q)", applicationType: "Prior Approval", scale: "medium", isCommercial: false, dwellingRange: [3, 3] },
  { description: "Demolition of existing dwelling and erection of replacement dwelling", applicationType: "Full Planning Permission", scale: "medium", isCommercial: false, dwellingRange: [1, 1] },
  { description: "Construction of new build detached dwelling with double garage", applicationType: "Full Planning Permission", scale: "medium", isCommercial: false, dwellingRange: [1, 1] },
  { description: "Conversion of existing barn to residential dwelling", applicationType: "Full Planning Permission", scale: "medium", isCommercial: false, dwellingRange: [1, 1] },
  { description: "Erection of extension to existing commercial unit and new shopfront", applicationType: "Full Planning Permission", scale: "medium", isCommercial: true, dwellingRange: [0, 0] },
  { description: "Change of use from office (Use Class E) to 6no. residential apartments", applicationType: "Full Planning Permission (Major)", scale: "large", isCommercial: false, dwellingRange: [6, 6] },
  { description: "Construction of new build care home with associated parking and landscaping", applicationType: "Full Planning Permission (Major)", scale: "large", isCommercial: true, dwellingRange: [0, 0] },
  { description: "Outline application for up to 25no. dwellings with all matters reserved", applicationType: "Outline Planning Permission", scale: "large", isCommercial: false, dwellingRange: [0, 25] },
];

const TYPE_CODES: Record<string, string> = {
  Householder: "HOU",
  "Full Planning Permission": "FUL",
  "Full Planning Permission (Major)": "FUL",
  "Change of Use": "COU",
  "Prior Approval": "PA3",
  "Outline Planning Permission": "OUT",
};

const STREET_NAMES = [
  "High Street", "Church Lane", "Mill Road", "Station Road", "Victoria Street",
  "Kings Road", "Park Avenue", "Meadow Way", "Orchard Close", "The Green",
  "Fenwick Road", "Chapel Street", "Manor Drive", "Elm Grove", "Bridge Street",
];

/** Deterministic PRNG (mulberry32) so the demo dataset is stable across restarts. */
function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(rng: () => number, from: number, to: number): Date {
  const now = Date.now();
  const days = intBetween(rng, from, to);
  return new Date(now - days * 24 * 60 * 60 * 1000);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type IntendedStatus =
  | "submitted" | "under_consideration" | "decision_expected"
  | "approved" | "rejected" | "withdrawn" | "appeal_lodged";

// Roughly matches the real-world mix of a live planning register: mostly
// pending, a meaningful decided tail, few withdrawals/appeals.
const STATUS_WEIGHTS: [IntendedStatus, number][] = [
  ["submitted", 12],
  ["under_consideration", 20],
  ["decision_expected", 13],
  ["approved", 38],
  ["rejected", 10],
  ["withdrawn", 4],
  ["appeal_lodged", 3],
];

function pickStatus(rng: () => number): IntendedStatus {
  const total = STATUS_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    if (roll < weight) return status;
    roll -= weight;
  }
  return "approved";
}

/**
 * Builds raw stage/date fields that normalise.ts's mapStatus() will resolve
 * back to `intended` — so the generated dataset exercises the full range of
 * statuses (and therefore the full range of opportunity-score stage
 * multipliers and the approval-alert path) predictably rather than by luck.
 */
function applyIntendedStatus(
  rng: () => number,
  intended: IntendedStatus,
  receivedDate: Date,
): {
  stage: string;
  statusRaw: string;
  decisionOutcomeRaw: string | null;
  decisionDate: string | null;
  decisionDueDate: string | null;
  validatedDate: string | null;
  appealStatus: string | null;
} {
  const validatedDate = new Date(receivedDate.getTime() + intBetween(rng, 2, 10) * 24 * 60 * 60 * 1000);

  switch (intended) {
    case "submitted":
      return { stage: "pending", statusRaw: "Application Received", decisionOutcomeRaw: null, decisionDate: null, decisionDueDate: null, validatedDate: null, appealStatus: null };
    case "under_consideration":
      return { stage: "pending", statusRaw: "Under Consideration", decisionOutcomeRaw: null, decisionDate: null, decisionDueDate: isoDate(daysAgo(rng, -60, -30)), validatedDate: isoDate(validatedDate), appealStatus: null };
    case "decision_expected":
      return { stage: "pending", statusRaw: "Awaiting Decision", decisionOutcomeRaw: null, decisionDate: null, decisionDueDate: isoDate(daysAgo(rng, -10, -1)), validatedDate: isoDate(validatedDate), appealStatus: null };
    case "approved": {
      const decisionDate = new Date(validatedDate.getTime() + intBetween(rng, 21, 56) * 24 * 60 * 60 * 1000);
      return { stage: "decided", statusRaw: "Application Permitted", decisionOutcomeRaw: pick(rng, ["Approved", "Granted", "Permitted with Conditions"]), decisionDate: isoDate(decisionDate), decisionDueDate: null, validatedDate: isoDate(validatedDate), appealStatus: null };
    }
    case "rejected": {
      const decisionDate = new Date(validatedDate.getTime() + intBetween(rng, 21, 56) * 24 * 60 * 60 * 1000);
      return { stage: "decided", statusRaw: "Application Refused", decisionOutcomeRaw: pick(rng, ["Refused", "Rejected"]), decisionDate: isoDate(decisionDate), decisionDueDate: null, validatedDate: isoDate(validatedDate), appealStatus: null };
    }
    case "withdrawn":
      return { stage: "withdrawn", statusRaw: "Application Withdrawn", decisionOutcomeRaw: null, decisionDate: null, decisionDueDate: null, validatedDate: isoDate(validatedDate), appealStatus: null };
    case "appeal_lodged": {
      const decisionDate = new Date(validatedDate.getTime() + intBetween(rng, 21, 56) * 24 * 60 * 60 * 1000);
      return { stage: "decided", statusRaw: "Refused - Under Appeal", decisionOutcomeRaw: "Refused", decisionDate: isoDate(decisionDate), decisionDueDate: null, validatedDate: isoDate(validatedDate), appealStatus: "Appeal Lodged" };
    }
  }
}

/**
 * Generates a stable, realistic synthetic dataset spread across every
 * seeded postcode district. Same seed -> same data every process start, so
 * the demo stays coherent across dev-server restarts.
 */
export function generateMockApplications(seed = 20260907, perDistrict = 4): RawApplication[] {
  const rng = mulberry32(seed);
  const applications: RawApplication[] = [];
  let sequence = 1;

  for (const district of DISTRICTS) {
    const count = intBetween(rng, Math.max(1, perDistrict - 2), perDistrict + 2);
    const authorityName = `${district.postTown} Council`;
    const authorityCode = slugify(district.postTown);

    for (let i = 0; i < count; i++) {
      const template = pick(rng, PROPOSAL_TEMPLATES);
      const receivedDate = daysAgo(rng, 3, 240);
      const intended = pickStatus(rng);
      const statusFields = applyIntendedStatus(rng, intended, receivedDate);

      const year = new Date(receivedDate).getFullYear().toString().slice(-2);
      const typeCode = TYPE_CODES[template.applicationType] ?? "FUL";
      const reference = `${year}/${String(sequence).padStart(5, "0")}/${typeCode}`;

      const houseNumber = intBetween(rng, 1, 180);
      const street = pick(rng, STREET_NAMES);
      const inward = `${intBetween(rng, 0, 9)}${String.fromCharCode(65 + Math.floor(rng() * 26))}${String.fromCharCode(65 + Math.floor(rng() * 26))}`;
      const postcode = `${district.code} ${inward}`;

      const dwellingCount =
        template.dwellingRange[0] === 0 && template.dwellingRange[1] === 0
          ? null
          : intBetween(rng, template.dwellingRange[0] === 0 ? 1 : template.dwellingRange[0], Math.max(template.dwellingRange[1], 1));

      const floorspaceSqm =
        template.scale === "small" ? intBetween(rng, 15, 45)
        : template.scale === "medium" ? intBetween(rng, 45, 180)
        : intBetween(rng, 180, 1500);

      // ~15% of applications have a later change (status recorded after the
      // initial received date) so fetchUpdatedApplications has real rows to
      // find; the rest are unchanged since first appearing.
      const wasUpdatedLater = rng() < 0.15;
      const changedAt = wasUpdatedLater
        ? new Date(receivedDate.getTime() + intBetween(rng, 5, 60) * 24 * 60 * 60 * 1000).toISOString()
        : receivedDate.toISOString();

      const lat = district.lat !== null ? district.lat + (rng() - 0.5) * 0.02 : null;
      const lng = district.lng !== null ? district.lng + (rng() - 0.5) * 0.02 : null;

      const raw: RawApplication = {
        provider: "mock",
        providerId: `mock-${sequence}`,
        reference,
        authorityName,
        authorityCode,
        addressText: `${houseNumber} ${street}, ${district.postTown}`,
        postcode,
        latitude: lat,
        longitude: lng,
        applicationType: template.applicationType,
        proposalDescription: template.description,
        stage: statusFields.stage,
        statusRaw: statusFields.statusRaw,
        decisionOutcomeRaw: statusFields.decisionOutcomeRaw,
        receivedDate: isoDate(receivedDate),
        validatedDate: statusFields.validatedDate,
        decisionDueDate: statusFields.decisionDueDate,
        decisionDate: statusFields.decisionDate,
        appealStatus: statusFields.appealStatus,
        dwellingCount,
        isCommercial: template.isCommercial,
        floorspaceSqm,
        applicantName: null,
        agentCompany: null,
        estimatedValueGbp: null,
        sourceUrl: `https://mock.tradesignal.local/applications/mock-${sequence}`,
        changedAt,
        raw: {},
      };
      raw.raw = { ...raw };

      applications.push(raw);
      sequence++;
    }
  }

  return applications;
}
