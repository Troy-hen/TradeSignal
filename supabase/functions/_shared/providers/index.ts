import { createPublicProcurementProvider } from "../market-signal-providers/public-procurement.ts";
import { configuredMarketSignalProviders } from "../market-signal-providers/types.ts";
import { CompaniesHouseAdapter } from "./companies-house.ts";
import { MarketSignalAdapter } from "./market-signal-adapter.ts";
import { PlanningAdapter } from "./planning-adapter.ts";
import { ProviderRegistry } from "./types.ts";

/**
 * One registry is the only place where provider-specific implementations are
 * assembled. Pipeline code should depend on ProviderAdapter, never on Plota,
 * OCDS, Companies House or a paid enrichment vendor directly.
 */
export function createConfiguredProviderRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  const planningKey = Deno.env.get("PLANNING_PROVIDER")?.trim().toLowerCase() || "mock";
  registry.register(new PlanningAdapter(planningKey, planningKey === "plota" ? "Plota" : "Fixture planning provider"));

  if (Deno.env.get("COMPANIES_HOUSE_API_KEY")) {
    registry.register(new CompaniesHouseAdapter());
  }

  for (const providerKey of configuredMarketSignalProviders()) {
    const provider = createPublicProcurementProvider(providerKey);
    registry.register(new MarketSignalAdapter(providerKey, providerKey, provider));
  }

  return registry;
}

export { ProviderRegistry } from "./types.ts";
export type { ProviderAdapter, ProviderFetchRequest, ProviderSourceRecord, NormalizedProviderRecord, ProviderDataRights } from "./types.ts";
