import "server-only";
import type { User } from "@supabase/supabase-js";

/**
 * Demo access is an explicit server-side allow-list. A client flag, email
 * domain, NODE_ENV check, or arbitrary user metadata must never activate a
 * territory without payment.
 */
export function isConfiguredDemoUser(user: Pick<User, "id" | "email">): boolean {
  const allowedIds = parseList(process.env.MYTRADEBOX_DEMO_USER_IDS);
  const allowedEmails = parseList(process.env.MYTRADEBOX_DEMO_USER_EMAILS).map((value) => value.toLowerCase());

  return allowedIds.has(user.id) || (user.email ? allowedEmails.includes(user.email.toLowerCase()) : false);
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
