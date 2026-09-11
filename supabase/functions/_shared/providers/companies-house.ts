import { defaultRights, sha256, type NormalizedProviderRecord, type ProviderAdapter, type ProviderFetchRequest, type ProviderSourceRecord } from "./types.ts";

type CompaniesHouseSearchItem = {
  title?: string;
  company_number?: string;
  company_status?: string;
  company_type?: string;
  date_of_creation?: string;
  address?: Record<string, unknown>;
  links?: { self?: string };
};

export class CompaniesHouseAdapter implements ProviderAdapter {
  readonly key = "companies_house";
  readonly displayName = "Companies House";
  readonly kind = "source" as const;

  isConfigured(): boolean {
    return Boolean(Deno.env.get("COMPANIES_HOUSE_API_KEY"));
  }

  async fetch(request: ProviderFetchRequest): Promise<ProviderSourceRecord[]> {
    const query = request.query?.trim();
    if (!query) throw new Error("Companies House adapter requires a company-name query");
    const apiKey = Deno.env.get("COMPANIES_HOUSE_API_KEY");
    if (!apiKey) throw new Error("COMPANIES_HOUSE_API_KEY is not configured");

    const url = new URL("https://api.company-information.service.gov.uk/search/companies");
    url.searchParams.set("q", query);
    url.searchParams.set("items_per_page", String(Math.max(1, Math.min(request.limit ?? 20, 100))));
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
      },
    });
    if (!response.ok) throw new Error(`Companies House returned HTTP ${response.status}`);
    const body = await response.json() as { items?: CompaniesHouseSearchItem[] };
    return Promise.all((body.items ?? []).filter((item) => item.company_number).map(async (item) => {
      const payload = item as unknown as Record<string, unknown>;
      return {
        providerKey: this.key,
        recordType: "company_search_result",
        externalId: item.company_number!,
        sourceUrl: item.links?.self ? `https://api.company-information.service.gov.uk${item.links.self}` : null,
        publishedAt: item.date_of_creation ?? null,
        retrievedAt: new Date().toISOString(),
        contentHash: await sha256(JSON.stringify(payload)),
        payload,
        rights: defaultRights(false),
        isFixture: false,
      } satisfies ProviderSourceRecord;
    }));
  }

  async normalize(record: ProviderSourceRecord): Promise<NormalizedProviderRecord> {
    const payload = record.payload as CompaniesHouseSearchItem;
    return {
      ...record,
      entityObservation: {
        name: payload.title ?? null,
        legalName: payload.title ?? null,
        companiesHouseNumber: payload.company_number ?? record.externalId,
        resolutionMethod: "companies_house_number",
        resolutionConfidence: 1,
      },
      eventObservations: [{
        eventType: "company_observed",
        occurredAt: record.retrievedAt,
        factualData: payload as unknown as Record<string, unknown>,
      }],
      signalObservations: [],
    };
  }
}

