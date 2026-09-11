import "server-only";
import type { User } from "@supabase/supabase-js";

/**
 * Demo access is an explicit server-side allow-list. The generic variables
 * are used by the new product; the legacy names remain a compatibility alias
 * while the cloned application is being rebranded.
 */
export function isConfiguredDemoUser(user: Pick<User, "id" | "email">): boolean {
  const allowedIds = new Set(parseList(process.env.DEMO_USER_IDS || process.env.MYTRADEBOX_DEMO_USER_IDS));
  const allowedEmails = parseList(process.env.DEMO_USER_EMAILS || process.env.MYTRADEBOX_DEMO_USER_EMAILS).map((value) => value.toLowerCase());

  return allowedIds.has(user.id) || (user.email ? allowedEmails.includes(user.email.toLowerCase()) : false);
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

