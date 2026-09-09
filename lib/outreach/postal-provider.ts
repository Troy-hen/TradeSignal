import "server-only";

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

export type PostalLetterResult = {
  providerJobId: string;
  status: "queued" | "sent";
  costPence?: number | null;
  trackingUrl?: string | null;
};

export interface PostalOutreachProvider {
  readonly name: string;
  sendLetter(request: PostalLetterRequest): Promise<PostalLetterResult>;
  getStatus(providerJobId: string): Promise<{
    status: "queued" | "sent" | "delivered" | "failed" | "cancelled";
    trackingUrl?: string | null;
    errorMessage?: string | null;
  }>;
}

/**
 * A postal provider must be explicitly configured before the product exposes
 * a Send letter action. This keeps generated outreach and paid delivery as
 * separate concerns and prevents a UI button from implying delivery exists.
 */
export function getPostalOutreachProvider(): PostalOutreachProvider | null {
  const configured = process.env.POSTAL_OUTREACH_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "none") return null;
  throw new Error(`Unsupported POSTAL_OUTREACH_PROVIDER: ${configured}`);
}
