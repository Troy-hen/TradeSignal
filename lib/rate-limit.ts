import { getCloudflareContext } from "@opennextjs/cloudflare";

interface CloudflareRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Edge-layer primary defense for the public territory checker (see
 * wrangler.jsonc's TERRITORY_CHECK_LIMITER binding). Only present when
 * actually running on Cloudflare — local `next dev`, CI, and any other
 * environment have no such binding, so this deliberately fails open to
 * `allowed: true` rather than throwing. That's safe because it is never
 * the only layer: check_territory_availability() enforces its own
 * DB-level limit (rate_limit_events) regardless of what happens here,
 * which is what actually protects environments without this binding.
 */
export async function checkEdgeRateLimit(key: string): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const limiter = (env as Record<string, unknown>).TERRITORY_CHECK_LIMITER as CloudflareRateLimiter | undefined;
    if (!limiter) return true;

    const { success } = await limiter.limit({ key });
    return success;
  } catch {
    return true;
  }
}
