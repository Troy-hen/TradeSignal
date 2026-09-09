import "server-only";
import type {
  PostalAddressValidation,
  PostalLetterPreview,
  PostalLetterRequest,
  PostalLetterResult,
  PostalOutreachProvider,
  PostalRecipient,
} from "./postal-provider";

const BASE_URL = "https://api-eu1.stannp.com/v1";

type StannpResponse<T> = { success?: boolean; data?: T; error?: string; message?: string };
type LetterData = {
  id?: string | number;
  pdf?: string;
  pdf_file?: string;
  cost?: string | number;
  status?: string;
  tracking_ref?: string | null;
};

type AddressData = {
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  is_valid?: boolean;
};

export class StannpPostalOutreachProvider implements PostalOutreachProvider {
  readonly name = "stannp";

  constructor(private readonly apiKey: string) {}

  async validateAddress(recipient: PostalRecipient): Promise<PostalAddressValidation> {
    const body = new URLSearchParams({
      address1: recipient.addressLine1,
      postcode: recipient.postcode,
      country: recipient.country ?? "GB",
    });
    if (recipient.addressLine2) body.set("address2", recipient.addressLine2);
    if (recipient.city) body.set("city", recipient.city);

    const response = await this.request<AddressData>("/addresses/validate", body);
    const data = response.data ?? {};
    return {
      valid: data.is_valid === true,
      normalized: data.address1 && data.postcode
        ? {
            name: recipient.name ?? null,
            addressLine1: data.address1,
            addressLine2: data.address2 ?? data.address3 ?? null,
            city: data.city ?? recipient.city ?? null,
            postcode: data.postcode,
            country: data.country ?? recipient.country ?? "GB",
          }
        : null,
    };
  }

  async previewLetter(request: PostalLetterRequest): Promise<PostalLetterPreview> {
    const data = await this.createLetter(request, true);
    return {
      previewUrl: data.pdf ?? data.pdf_file ?? null,
      estimatedCostPence: toPence(data.cost),
    };
  }

  async sendLetter(request: PostalLetterRequest): Promise<PostalLetterResult> {
    const data = await this.createLetter(request, false);
    if (data.id === undefined || data.id === null) throw new Error("Stannp did not return a letter id");
    return {
      providerJobId: String(data.id),
      status: mapStatus(data.status) === "sent" ? "sent" : "queued",
      costPence: toPence(data.cost),
      trackingUrl: null,
    };
  }

  async getStatus(providerJobId: string) {
    const response = await this.request<LetterData>(`/letters/get/${encodeURIComponent(providerJobId)}`);
    const data = response.data ?? {};
    return {
      status: mapStatus(data.status),
      trackingUrl: null,
      errorMessage: data.status === "returned" ? "Mailpiece was returned by the delivery network." : null,
    };
  }

  private async createLetter(request: PostalLetterRequest, test: boolean): Promise<LetterData> {
    const body = new URLSearchParams({
      test: test ? "1" : "0",
      pages: textToHtml(request.content),
      idempotency_key: request.deliveryId,
      tags: `mytradebox,${request.reference}`,
      "recipient[company]": request.recipient.name ?? "Property Owner / Occupier",
      "recipient[address1]": request.recipient.addressLine1,
      "recipient[postcode]": request.recipient.postcode,
      "recipient[country]": request.recipient.country ?? "GB",
    });
    if (request.recipient.addressLine2) body.set("recipient[address2]", request.recipient.addressLine2);
    if (request.recipient.city) body.set("recipient[city]", request.recipient.city);

    const response = await this.request<LetterData>("/letters/create", body);
    if (!response.data) throw new Error("Stannp returned no letter data");
    return response.data;
  }

  private async request<T>(path: string, body?: URLSearchParams): Promise<StannpResponse<T>> {
    const auth = Buffer.from(`${this.apiKey}:`).toString("base64");
    const response = await fetch(`${BASE_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: body?.toString(),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as StannpResponse<T>;
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error ?? payload.message ?? `Stannp API failed with status ${response.status}`);
    }
    return payload;
  }
}

function textToHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
}

function toPence(value: string | number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function mapStatus(value: string | null | undefined): "queued" | "sent" | "delivered" | "failed" | "cancelled" {
  const status = (value ?? "").toLowerCase();
  if (status === "delivered") return "delivered";
  if (["handed_over", "local_delivery", "dispatched", "sent"].includes(status)) return "sent";
  if (status === "cancelled") return "cancelled";
  if (["failed", "returned"].includes(status)) return "failed";
  return "queued";
}
