import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Relies purely on RLS rather than a separate is_platform_admin() RPC call:
 * admin_users' own SELECT policy is is_platform_admin(), so a non-admin
 * querying their own profile_id simply gets zero rows back — behaviourally
 * identical to being blocked, with no extra grant to reason about.
 */
export async function requirePlatformAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("admin_users").select("profile_id").eq("profile_id", user.id).maybeSingle();
  if (!data) redirect("/dashboard");

  return user;
}
