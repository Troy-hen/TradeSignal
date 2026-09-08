import type { PlotaApplication, PlotaListMeta, PlotaListResponse, PlotaErrorBody } from "./types.ts";

const BASE_URL = "https://api.plota.co.uk/v1";
const MAX_RATE_LIMIT_RETRIES = 3;
const DEMO_PAGE_SIZE = 10;

export class PlotaApiError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "PlotaApiError";
  }
}

export class PlotaClient {
  /** The latest response metadata is retained for diagnostics (never sent to the browser). */
  public lastMeta: PlotaListMeta | null = null;
  /** Number of HTTP requests made by this client, including rate-limit retries. */
  public requestCount = 0;
  /** Number of successful list pages returned by the latest list/paginate operation. */
  public lastPageCount = 0;

  constructor(private readonly apiKey: string) {}

  private async request<T>(
    path: string,
    searchParams?: Record<string, string | number | undefined>,
    retryCount = 0,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    this.requestCount++;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (res.status === 429 && retryCount < MAX_RATE_LIMIT_RETRIES) {
      const retryAfterSeconds = Number(res.headers.get("Retry-After") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfterSeconds, 1) * 1000));
      return this.request<T>(path, searchParams, retryCount + 1);
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as PlotaErrorBody | null;
      throw new PlotaApiError(
        body?.error?.message ?? `Plota API request failed with status ${res.status}`,
        body?.error?.type ?? "unknown_error",
        res.status,
        body?.error?.request_id,
      );
    }

    return res.json() as Promise<T>;
  }

  private listParams(searchParams?: Record<string, string | number | undefined>) {
    return {
      ...searchParams,
      // The demo key cannot request pages larger than 10. Explicitly setting
      // this also keeps targeted smoke tests predictable and quota-friendly.
      limit: searchParams?.limit ?? DEMO_PAGE_SIZE,
    };
  }

  /** Follows meta.next_cursor until exhausted. */
  async *paginate(
    path: string,
    searchParams?: Record<string, string | number | undefined>,
  ): AsyncGenerator<PlotaApplication[]> {
    const initialCursor = searchParams?.cursor;
    const filters = { ...searchParams };
    delete filters.cursor;

    let cursor: string | undefined = initialCursor;
    this.lastPageCount = 0;
    do {
      const page = await this.request<PlotaListResponse>(path, {
        ...this.listParams(filters),
        cursor,
      });
      this.lastMeta = page.meta ?? null;
      this.lastPageCount++;
      yield page.data ?? [];
      cursor = page.meta?.next_cursor ?? undefined;
    } while (cursor);
  }

  async list(path: string, searchParams?: Record<string, string | number | undefined>): Promise<PlotaApplication[]> {
    const page = await this.request<PlotaListResponse>(path, this.listParams(searchParams));
    this.lastMeta = page.meta ?? null;
    this.lastPageCount = 1;
    return page.data ?? [];
  }

  async getApplication(id: string): Promise<PlotaApplication | null> {
    try {
      return await this.request<PlotaApplication>(`/applications/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof PlotaApiError && err.status === 404) return null;
      throw err;
    }
  }
}
