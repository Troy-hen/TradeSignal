import "server-only";
import { StannpPostalOutreachProvider } from "./stannp-provider";

export type PostalRecipient = {
  name?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  postcode: string;
  country?: string | null;
};

export type PostalLetterRequest = {
  deliveryId: string;
  recipient: PostalRecipient;
  content: string;
  reference: string;
};

export type PostalLetterPreview = {
  previewUrl: string | null;
  estimatedCostPence: number | null;
};

export type PostalAddressValidation = {
  valid: boolean;
  normalized: PostalRecipient | null;
};

export type PostalLetterResult = {
  providerJobId: string;
  status: "queued" | "sent";
  costPence?: number | null;
  trackingUrl?: string | null;
};

export interface PostalOutreachProvider {
  readonly name: string;
  validateAddress(recipient: PostalRecipient): Promise<PostalAddressValidation>;
  previewLetter(request: PostalLetterRequest): Promise<PostalLetterPreview>;
  sendLetter(request: PostalLetterRequest): Promise<PostalLetterResult>;
  getStatus(providerJobId: string): Promise<{
    status: "queued" | "sent" | "delivered" | "failed" | "cancelled";
    trackingUrl?: string | null;
    errorMessage?: string | null;
  }>;
}

/**
 * A postal provider must be explicitly configured before the product exposes
 * a Send letter action. Generated outreach and paid delivery remain separate
 * until the provider key is present.
 */
export function getPostalOutreachProvider(): PostalOutreachProvider | null {
  const configured = process.env.POSTAL_OUTREACH_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "none") return null;

  if (configured === "stannp") {
    const apiKey = process.env.STANNP_API_KEY;
    if (!apiKey) throw new Error("POSTAL_OUTREACH_PROVIDER=stannp requires STANNP_API_KEY");
    return new StannpPostalOutreachProvider(apiKey);
  }

  throw new Error(`Unsupported POSTAL_OUTREACH_PROVIDER: ${configured}`);
}
