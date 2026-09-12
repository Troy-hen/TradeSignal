"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthActionState } from "@/lib/actions/auth";

const companySchema = z.object({
  tradingName: z.string().trim().min(2, "Enter your company name"),
  billingEmail: z.string().trim().email("Enter a valid billing email"),
});

export async function createCompany(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = companySchema.safeParse({
    tradingName: formData.get("tradingName"),
    billingEmail: formData.get("billingEmail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // create_company_and_claim_ownership resolves the owner from auth.uid()
  // server-side inside the RPC — this call never sends a user/company id.
  const { error } = await supabase.rpc("create_company_and_claim_ownership", {
    p_trading_name: parsed.data.tradingName,
    p_billing_email: parsed.data.billingEmail,
  });

  if (error) return { error: "Could not create your company. Please try again." };

  redirect("/dashboard");
}
