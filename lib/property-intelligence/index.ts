import "server-only";
import type { PropertyIntelligenceProvider } from "./types";
import { getTwentyCiConfig, TwentyCiPropertyIntelligenceProvider } from "./twentyci";

export function getPropertyIntelligenceProvider(): PropertyIntelligenceProvider | null {
  const provider = process.env.PROPERTY_INTELLIGENCE_PROVIDER?.trim().toLowerCase() ?? "none";
  if (provider === "none" || provider === "") return null;
  if (provider === "twentyci") {
    const config = getTwentyCiConfig();
    return config ? new TwentyCiPropertyIntelligenceProvider(config) : null;
  }
  throw new Error(`Unsupported PROPERTY_INTELLIGENCE_PROVIDER: ${provider}`);
}

export function isPropertyIntelligenceConfigured() {
  try {
    return getPropertyIntelligenceProvider() !== null;
  } catch {
    return false;
  }
}

export type { PropertyIntelligenceSnapshot, PropertyActivitySignal } from "./types";
