/**
 * Minimal Resend wrapper — a single POST to their API, no SDK dependency
 * needed for the small surface this project uses.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const fromName = Deno.env.get("RESEND_FROM_NAME");
  const replyTo = Deno.env.get("RESEND_REPLY_TO");

  if (!apiKey || !fromEmail) {
    return { success: false, error: "RESEND_API_KEY or RESEND_FROM_EMAIL is not configured" };
  }

  const from =
    fromName && !fromEmail.includes("<")
      ? fromName + " <" + fromEmail + ">"
      : fromEmail;

  try {
    const body: Record<string, unknown> = {
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    };

    if (replyTo) body.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseBody = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        error: responseBody?.message ?? "Resend API request failed with status " + res.status,
      };
    }

    return { success: true, messageId: responseBody?.id ?? "unknown" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
