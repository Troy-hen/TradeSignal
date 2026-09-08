import "server-only";
import type { PlanningDataProvider } from "./types";
import { getMockPlanningProvider } from "./mock/provider";
import { PlotaClient } from "./plota/client";
import { PlotaPlanningProvider } from "./plota/provider";

/**
 * PLANNING_PROVIDER=mock (the default) needs zero external credentials.
 * Switching to "plota" requires PLOTA_API_KEY; adding a further provider
 * later (PlanWire, Internal) means one new file + one branch here — nothing
 * in the ingestion/enrichment/matching pipeline changes, since all of it is
 * written against PlanningDataProvider.
 */
export function getPlanningProvider(): PlanningDataProvider {
  if (process.env.PLANNING_PROVIDER === "plota") {
    const apiKey = process.env.PLOTA_API_KEY;
    if (!apiKey) {
      throw new Error("PLOTA_API_KEY is not configured but PLANNING_PROVIDER=plota");
    }
    // The live Edge Function runs against the Plota Demo-safe path. Do not
    // read a plan-tier secret: the Demo key is intentionally self-contained.
    return new PlotaPlanningProvider(new PlotaClient(apiKey), "demo");
  }
  return getMockPlanningProvider();
}

export type { PlanningDataProvider, RawApplication, NormalisedApplication } from "./types";
