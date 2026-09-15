/**
 * Keep webhook delivery and connection tests behind the same SSRF guard.
 * CRM endpoints must be public HTTPS URLs; private network targets are never
 * valid destinations for a customer connection.
 */
export function isUnsafeWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol !== "https:" || host === "localhost" || host === "::1" || host === "0.0.0.0" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  } catch {
    return true;
  }
}
