"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";

/**
 * Joins the waitlist for a taken territory. Bound with postcodeDistrict/
 * tradeCategoryId/tradeSlug via .bind() when used as a <form action>. Never
 * exposes which company currently holds the territory.
 */
export async function joinTerritoryWaitlist(
  postcodeDistrict: string,
  tradeCategoryId: string,
  tradeSlug: string,
) {
  const company = await getCurrentCompany();
  if (!company) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.from("territory_waitlist").insert({
    postcode_district: postcodeDistrict,
    trade_category_id: tradeCategoryId,
    company_id: company.id,
  });

  // 23505 = already on the waitlist for this district+trade — not an error.
  if (error && error.code !== "23505") {
    throw new Error("Could not join the waitlist. Please try again.");
  }

  revalidatePath(`/territories/${postcodeDistrict}/${tradeSlug}`);
}
