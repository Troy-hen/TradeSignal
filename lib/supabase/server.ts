import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

/**
 * Server Component / Route Handler / Server Action client — runs with the
 * calling user's own session, so auth.uid() resolves correctly and every
 * RLS policy applies exactly as it would for that user. Never use this for
 * privileged operations; that's what admin.ts is for.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies (no
            // active response) — the proxy below refreshes the session
            // instead, so this is safe to ignore.
          }
        },
      },
    },
  );
}
