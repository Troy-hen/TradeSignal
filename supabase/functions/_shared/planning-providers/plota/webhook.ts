/**
 * Documented but not wired as a core MVP path — polling via the endpoints
 * in provider.ts already satisfies "incremental scheduled ingestion" on its
 * own, and Plota's webhooks fire per saved alert rather than our own trade
 * taxonomy. Implemented so it's ready if/when webhook-based low-latency
 * ingestion becomes worth adding.
 *
 * Uses the Web Crypto API (Deno has no built-in timingSafeEqual, so the
 * constant-time compare is hand-rolled via XOR-accumulate over the hex
 * digest — a standard, correct substitute).
 */
export async function verifyPlotaWebhookSignature(params: {
  rawBody: string;
  timestampHeader: string;
  signatureHeader: string;
  secret: string;
}): Promise<boolean> {
  const { rawBody, timestampHeader, signatureHeader, secret } = params;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestampHeader}.${rawBody}`));
  const expectedHex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  if (expectedHex.length !== signatureHeader.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return mismatch === 0;
}
