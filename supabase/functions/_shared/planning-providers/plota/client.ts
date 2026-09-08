import type { PlotaApplication, PlotaListResponse, PlotaErrorBody } from "./types.ts";

const BASE_URL = "https://api.plota.co.uk/v1";
const MAX_RATE_LIMIT_RETRIES = 3;

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

  /** Follows meta.next_cursor until exhausted. */
  async *paginate(
    path: string,
    searchParams?: Record<string, string | number | undefined>,
  ): AsyncGenerator<PlotaApplication[]> {
    let cursor: string | undefined;
    do {
      const page = await this.request<PlotaListResponse>(path, { ...searchParams, cursor });
      yield page.data;
      cursor = page.meta.next_cursor ?? undefined;
    } while (cursor);
  }

  async list(path: string, searchParams?: Record<string, string | number | undefined>): Promise<PlotaApplication[]> {
    const page = await this.request<PlotaListResponse>(path, searchParams);
    return page.data;
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
