import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CurrentCompany = {
  id: string;
  trading_name: string;
  role: "owner" | "admin" | "member";
};

/**
 * Resolves the signed-in user's company + role server-side via
 * company_memberships — never from a client-supplied id. Returns null if the
 * user has no company yet (fresh signup, still in onboarding) or isn't
 * signed in. A user with multiple companies gets their first active
 * membership; switching companies is out of scope for the MVP.
 */
export async function getCurrentCompany(): Promise<CurrentCompany | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("company_memberships")
    .select("role, companies!inner(id, trading_name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const company = data.companies;
  return {
    id: company.id,
    trading_name: company.trading_name,
    role: data.role,
  };
}

/** Same as getCurrentCompany, but redirects to onboarding/login when absent. */
export async function requireCurrentCompany(): Promise<CurrentCompany> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const company = await getCurrentCompany();
  if (!company) redirect("/onboarding/company");

  return company;
}
