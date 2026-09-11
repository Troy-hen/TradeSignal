import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { saveCustomerProfile, type CustomerProfileTerm } from "@/lib/data/customer-profile";
import { normaliseSellingProfile } from "@/lib/profile/normalise";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  what_do_you_sell: z.string().trim().min(2).max(500),
  ideal_customer: z.string().trim().max(500).nullable().optional(),
  exclusions: z.string().trim().max(500).nullable().optional(),
  where_do_you_sell: z.string().trim().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  const company = await getCurrentCompany();
  if (!company) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const idealCustomer = parsed.data.ideal_customer ?? null;
  const exclusions = parsed.data.exclusions ?? null;
  const whereDoYouSell = parsed.data.where_do_you_sell ?? null;
  const context = [
    "What the supplier sells: " + parsed.data.what_do_you_sell,
    idealCustomer ? "Ideal customer: " + idealCustomer : "",
    whereDoYouSell ? "Operating geography: " + whereDoYouSell : "",
    exclusions ? "Exclude: " + exclusions : "",
  ].filter(Boolean).join("\n");

  const { data: candidates } = await supabase
    .from("trade_categories")
    .select("slug, name, description")
    .eq("is_active", true)
    .order("display_order")
    .limit(120);

  const normalized = await normaliseSellingProfile(context, candidates ?? []);
  const normalizedProfile = {
    ...normalized,
    originalDescription: parsed.data.what_do_you_sell,
    idealCustomer,
    whereDoYouSell,
    exclusions,
  };
  const terms = buildTerms(normalized, idealCustomer, exclusions);

  const saved = await saveCustomerProfile({
    company_id: company.id,
    what_do_you_sell: parsed.data.what_do_you_sell,
    ideal_customer: idealCustomer,
    exclusions,
    where_do_you_sell: whereDoYouSell,
    normalized_profile: normalizedProfile,
    normalization_status: "complete",
    normalized_at: new Date().toISOString(),
    normalization_provider: normalized.source,
    normalization_error: null,
    updated_by: auth.user.id,
    terms,
  });

  if (!saved) return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
  return NextResponse.json({ profile: saved });
}

function buildTerms(
  profile: { label: string; keywords: string[]; buyerTypes: string[]; candidateTradeSlug: string | null; confidence: number; source: string },
  idealCustomer: string | null,
  exclusions: string | null,
): CustomerProfileTerm[] {
  const terms: CustomerProfileTerm[] = [];
  const add = (term_type: CustomerProfileTerm["term_type"], term: string, confidence = profile.confidence, source = profile.source) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    if (!terms.some((item) => item.term_type === term_type && item.term.toLowerCase() === cleaned.toLowerCase())) {
      terms.push({ term_type, term: cleaned.slice(0, 160), confidence, source });
    }
  };

  add("service", profile.label);
  if (profile.candidateTradeSlug) add("service", profile.candidateTradeSlug);
  profile.keywords.forEach((term) => add("commercial_need", term));
  profile.buyerTypes.forEach((term) => add("target_industry", term));
  if (idealCustomer) add("target_industry", idealCustomer, 1, "customer_entered");
  if (exclusions) exclusions.split(/[,;]|\band\b/i).forEach((term) => add("exclusion", term, 1, "customer_entered"));
  return terms;
}
