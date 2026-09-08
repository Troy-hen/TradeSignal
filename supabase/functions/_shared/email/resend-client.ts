/**
 * Minimal Resend wrapper — a single POST to their API, no SDK dependency
 * needed for the small surface this project uses (send one HTML email).
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");

  if (!apiKey || !from) {
    return { success: false, error: "RESEND_API_KEY or RESEND_FROM_EMAIL is not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return { success: false, error: body?.message ?? `Resend API request failed with status ${res.status}` };
    }

    return { success: true, messageId: body?.id ?? "unknown" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
