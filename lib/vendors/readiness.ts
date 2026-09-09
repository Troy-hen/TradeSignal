import "server-only";

export type VendorCapabilities = {
  ai: boolean;
  semanticRag: boolean;
  planningContactData: boolean;
  companiesHouse: boolean;
  postalOutreach: boolean;
  emailDelivery: boolean;
  marketSignals: boolean;
};

export function getVendorCapabilities(): VendorCapabilities {
  const contactProvider = process.env.CONTACT_INTELLIGENCE_PROVIDER?.trim().toLowerCase();
  const postalProvider = process.env.POSTAL_OUTREACH_PROVIDER?.trim().toLowerCase();
  const signalProvider = process.env.MARKET_SIGNAL_PROVIDER?.trim().toLowerCase();

  return {
    ai: Boolean(process.env.OPENAI_API_KEY),
    semanticRag: Boolean(process.env.OPENAI_API_KEY),
    planningContactData: contactProvider === "plota" && Boolean(process.env.PLOTA_API_KEY),
    companiesHouse: Boolean(process.env.COMPANIES_HOUSE_API_KEY),
    postalOutreach: postalProvider === "stannp" && Boolean(process.env.STANNP_API_KEY),
    emailDelivery: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    marketSignals: Boolean(signalProvider && signalProvider !== "none"),
  };
}
