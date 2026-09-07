import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client. Bypasses RLS entirely — use only in Edge Functions,
 * webhook route handlers, and the admin surface, never in code that renders
 * client-visible output driven by unvalidated request data. The `server-only`
 * import above makes it a build error to import this module from a Client
 * Component, and SUPABASE_SERVICE_ROLE_KEY is never NEXT_PUBLIC_-prefixed so
 * it's never inlined into the browser bundle regardless.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
