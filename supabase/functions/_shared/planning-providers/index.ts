import type { PlanningDataProvider } from "./types.ts";
import { getMockPlanningProvider } from "./mock/provider.ts";
import { PlotaClient } from "./plota/client.ts";
import { PlotaPlanningProvider } from "./plota/provider.ts";

/**
 * PLANNING_PROVIDER=mock (the default) needs zero external credentials.
 * Switching to "plota" requires PLOTA_API_KEY; adding a further provider
 * later (PlanWire, Internal) means one new file + one branch here — nothing
 * in the ingestion function changes, since all of it is written against
 * PlanningDataProvider.
 */
export function getPlanningProvider(): PlanningDataProvider {
  const providerName = Deno.env.get("PLANNING_PROVIDER") ?? "mock";
  if (providerName === "plota") {
    const apiKey = Deno.env.get("PLOTA_API_KEY");
    if (!apiKey) {
      throw new Error("PLOTA_API_KEY is not configured but PLANNING_PROVIDER=plota");
    }
    return new PlotaPlanningProvider(new PlotaClient(apiKey), Deno.env.get("PLOTA_PLAN_TIER") ?? "starter");
  }
  return getMockPlanningProvider();
}

export type { PlanningDataProvider, RawApplication, NormalisedApplication } from "./types.ts";
