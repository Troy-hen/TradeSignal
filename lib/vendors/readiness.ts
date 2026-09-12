import "server-only";

export type VendorCapabilities = {
  ai: boolean;
  semanticRag: boolean;
  planningContactData: boolean;
  companiesHouse: boolean;
  energyIntelligence: boolean;
  postalOutreach: boolean;
  emailDelivery: boolean;
  marketSignals: boolean;
};

export function getVendorCapabilities(): VendorCapabilities {
  const contactProvider = process.env.CONTACT_INTELLIGENCE_PROVIDER?.trim().toLowerCase();
  const postalProvider = process.env.POSTAL_OUTREACH_PROVIDER?.trim().toLowerCase();
  const signalProviders = process.env.MARKET_SIGNAL_PROVIDERS?.trim().toLowerCase();

  return {
    ai: Boolean(process.env.OPENAI_API_KEY),
    semanticRag: Boolean(process.env.OPENAI_API_KEY),
    planningContactData: contactProvider === "plota" && Boolean(process.env.PLOTA_API_KEY),
    companiesHouse: Boolean(process.env.COMPANIES_HOUSE_API_KEY),
    energyIntelligence: Boolean(process.env.EPC_API_BEARER_TOKEN),
    postalOutreach: postalProvider === "stannp" && Boolean(process.env.STANNP_API_KEY),
    // Platform/notification email is currently sent from Supabase Edge Functions,
    // so Cloudflare cannot reliably introspect whether Resend is configured there.
    // Keep this flag strictly scoped to a Resend sender configured in this runtime.
    emailDelivery: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    // The Edge ingestion layer defaults to Find a Tender + Contracts Finder when
    // MARKET_SIGNAL_PROVIDERS is absent. Mirror that default here rather than
    // incorrectly reporting public procurement as disabled.
    marketSignals: signalProviders !== "none",
  };
}
