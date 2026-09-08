import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Documented but not wired as a core MVP path — polling via the endpoints
 * in provider.ts already satisfies "incremental scheduled ingestion" on its
 * own, and Plota's webhooks fire per saved alert rather than our own trade
 * taxonomy. Implemented so it's ready if/when webhook-based low-latency
 * ingestion becomes worth adding.
 */
export function verifyPlotaWebhookSignature(params: {
  rawBody: string;
  timestampHeader: string;
  signatureHeader: string;
  secret: string;
}): boolean {
  const { rawBody, timestampHeader, signatureHeader, secret } = params;
  const expected = createHmac("sha256", secret).update(`${timestampHeader}.${rawBody}`).digest("hex");

  let expectedBuffer: Buffer;
  let providedBuffer: Buffer;
  try {
    expectedBuffer = Buffer.from(expected, "hex");
    providedBuffer = Buffer.from(signatureHeader, "hex");
  } catch {
    return false;
  }

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
