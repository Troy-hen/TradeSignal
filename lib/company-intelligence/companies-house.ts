import "server-only";

const BASE_URL = "https://api.company-information.service.gov.uk";

export type CompaniesHouseSummary = {
  companyNumber: string;
  companyName: string;
  companyStatus: string | null;
  companyStatusDetail: string | null;
  companyType: string | null;
  dateOfCreation: string | null;
  registeredOfficeAddress: string | null;
  officers: Array<{ name: string; role: string | null; appointedOn: string | null }>;
  accounts: {
    nextDueOn: string | null;
    overdue: boolean | null;
    lastMadeUpTo: string | null;
    lastAccountsType: string | null;
  };
  confirmationStatement: {
    nextDueOn: string | null;
    lastMadeUpTo: string | null;
  };
  hasCharges: boolean | null;
  hasInsolvencyHistory: boolean | null;
  healthLevel: "normal" | "review" | "elevated";
  healthSignals: string[];
  sourceUrl: string;
};

type SearchResponse = {
  items?: Array<{
    title?: string;
    company_number?: string;
    company_status?: string;
    company_type?: string;
    date_of_creation?: string;
    address_snippet?: string;
  }>;
};

type CompanyProfile = {
  company_name?: string;
  company_number?: string;
  company_status?: string;
  company_status_detail?: string;
  type?: string;
  date_of_creation?: string;
  registered_office_address?: Record<string, string | undefined>;
  accounts?: {
    next_accounts?: { due_on?: string; overdue?: boolean };
    last_accounts?: { made_up_to?: string; period_end_on?: string; type?: string | null };
    next_due?: string;
    overdue?: boolean;
  };
  confirmation_statement?: { next_due?: string; last_made_up_to?: string };
  has_charges?: boolean;
  has_insolvency_history?: boolean;
  links?: { charges?: string; insolvency?: string };
};

type OfficersResponse = {
  items?: Array<{
    name?: string;
    officer_role?: string;
    appointed_on?: string;
    resigned_on?: string;
  }>;
};

export async function getCompaniesHouseCompanySummary(name: string | null | undefined): Promise<CompaniesHouseSummary | null> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const query = name?.trim();
  if (!apiKey || !query || !looksCorporate(query)) return null;

  const search = await chFetch<SearchResponse>(`/search/companies?q=${encodeURIComponent(query)}&items_per_page=5`, apiKey);
  const candidate = chooseCandidate(query, search.items ?? []);
  if (!candidate?.company_number) return null;

  const [profile, officers] = await Promise.all([
    chFetch<CompanyProfile>(`/company/${encodeURIComponent(candidate.company_number)}`, apiKey),
    chFetch<OfficersResponse>(`/company/${encodeURIComponent(candidate.company_number)}/officers?items_per_page=20`, apiKey).catch(() => ({ items: [] })),
  ]);

  const companyNumber = profile.company_number ?? candidate.company_number;
  const status = profile.company_status ?? candidate.company_status ?? null;
  const statusDetail = profile.company_status_detail ?? null;
  const accountsOverdue = profile.accounts?.next_accounts?.overdue ?? profile.accounts?.overdue ?? null;
  const hasCharges = typeof profile.has_charges === "boolean" ? profile.has_charges : Boolean(profile.links?.charges) || null;
  const hasInsolvencyHistory = typeof profile.has_insolvency_history === "boolean" ? profile.has_insolvency_history : Boolean(profile.links?.insolvency) || null;
  const health = deriveCompanyHealth({ status, statusDetail, accountsOverdue, hasInsolvencyHistory });

  return {
    companyNumber,
    companyName: profile.company_name ?? candidate.title ?? query,
    companyStatus: status,
    companyStatusDetail: statusDetail,
    companyType: profile.type ?? candidate.company_type ?? null,
    dateOfCreation: profile.date_of_creation ?? candidate.date_of_creation ?? null,
    registeredOfficeAddress: formatAddress(profile.registered_office_address) ?? candidate.address_snippet ?? null,
    officers: (officers.items ?? [])
      .filter((officer) => officer.name && !officer.resigned_on)
      .slice(0, 8)
      .map((officer) => ({ name: officer.name!, role: officer.officer_role ?? null, appointedOn: officer.appointed_on ?? null })),
    accounts: {
      nextDueOn: profile.accounts?.next_accounts?.due_on ?? profile.accounts?.next_due ?? null,
      overdue: accountsOverdue,
      lastMadeUpTo: profile.accounts?.last_accounts?.made_up_to ?? profile.accounts?.last_accounts?.period_end_on ?? null,
      lastAccountsType: profile.accounts?.last_accounts?.type ?? null,
    },
    confirmationStatement: {
      nextDueOn: profile.confirmation_statement?.next_due ?? null,
      lastMadeUpTo: profile.confirmation_statement?.last_made_up_to ?? null,
    },
    hasCharges,
    hasInsolvencyHistory,
    healthLevel: health.level,
    healthSignals: health.signals,
    sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`,
  };
}

async function chFetch<T>(path: string, apiKey: string): Promise<T> {
  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Companies House API failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

function deriveCompanyHealth(input: { status: string | null; statusDetail: string | null; accountsOverdue: boolean | null; hasInsolvencyHistory: boolean | null }) {
  const signals: string[] = [];
  let severity = 0;
  if (input.status && input.status !== "active") {
    signals.push(`Companies House status is ${humanize(input.status)}.`);
    severity += 3;
  }
  if (input.statusDetail === "active-proposal-to-strike-off") {
    signals.push("An active proposal to strike off is recorded.");
    severity += 3;
  }
  if (input.accountsOverdue === true) {
    signals.push("The next accounts are recorded as overdue.");
    severity += 2;
  }
  if (input.hasInsolvencyHistory === true) {
    signals.push("Companies House indicates insolvency history or an insolvency record link.");
    severity += 3;
  }
  if (signals.length === 0 && input.status === "active") signals.push("Company is active and no basic registry warning was identified from the profile fields checked.");
  return { level: severity >= 3 ? "elevated" as const : severity > 0 ? "review" as const : "normal" as const, signals };
}

function chooseCandidate(query: string, items: NonNullable<SearchResponse["items"]>) {
  const normalized = normalizeName(query);
  return items.find((item) => normalizeName(item.title ?? "") === normalized) ?? items[0] ?? null;
}
function normalizeName(value: string) { return value.toLowerCase().replace(/\b(limited|ltd|plc|llp)\b/g, "").replace(/[^a-z0-9]/g, "").trim(); }
function looksCorporate(value: string) { return /\b(ltd|limited|plc|llp|developments?|properties|property|holdings?|construction|group|homes|housing|estates?)\b/i.test(value); }
function formatAddress(address?: Record<string, string | undefined>) { if (!address) return null; const fields = ["premises", "address_line_1", "address_line_2", "locality", "region", "postal_code", "country"]; const parts = fields.map((field) => address[field]).filter((value): value is string => Boolean(value?.trim())); return parts.length ? [...new Set(parts)].join(", ") : null; }
function humanize(value: string) { return value.replace(/-/g, " "); }
