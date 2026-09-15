import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { CoveragePlanSelector } from "@/components/coverage-plan-selector";
import { CoverageBuilder, type CoverageDistrictOption, type CoverageTradeOption } from "@/components/coverage-builder";
import { CustomerProfileForm } from "@/components/customer-profile-form";
import { getCustomerProfile } from "@/lib/data/customer-profile";
import { AppPageHeader } from "@/components/app-page-header";
import { AppSectionHeader } from "@/components/app-section-header";
import { formatMonthlyGbp, type CoveragePlanId } from "@/lib/coverage/pricing";

export default async function CoveragePage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const [{ data: plans }, profile, { data: trades }, { data: postcodeDistricts }] = await Promise.all([
    supabase.from("coverage_plans").select("id, status, billing_mode, monthly_price_pence, coverage_tier").eq("company_id", company.id).in("status", ["reserved", "active", "pending_change", "suspended"]).order("created_at"),
    getCustomerProfile(company.id),
    supabase.from("trade_categories").select("id, name, slug").eq("is_active", true).order("display_order"),
    supabase.from("postcode_districts").select("id, post_town").order("id"),
  ]);
  const canEdit = company.role === "owner" || company.role === "admin";
  const planViews = await Promise.all((plans ?? []).map(async (plan) => {
    const { data: items } = await supabase.from("coverage_plan_items").select("postcode_district, status").eq("coverage_plan_id", plan.id).in("status", ["active", "pending_add"]).order("postcode_district");
    return { id: plan.id, status: plan.status, coverageTier: plan.coverage_tier ?? "local", monthlyPricePence: Number(plan.monthly_price_pence), districts: (items ?? []).map((item) => item.postcode_district) };
  }));
  const activeTier = planViews.find((plan) => ["reserved", "active", "pending_change"].includes(plan.status))?.coverageTier;
  const initialPlan: CoveragePlanId = activeTier === "regional" || activeTier === "nationwide" ? activeTier : "local";
  const tradeOptions: CoverageTradeOption[] = (trades ?? []).map((trade) => ({ id: trade.id, name: trade.name, slug: trade.slug }));
  const districtOptions: CoverageDistrictOption[] = (postcodeDistricts ?? []).map((district) => ({ id: district.id, town: district.post_town ?? "" }));

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader
        eyebrow="Plan & profile"
        title="Set your profile and reach."
        description="Describe your business once, then choose how far the Marketplace should look. Every available source and B2B category remains included."
        actions={<><Link href="/billing#coverage-shape" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Review billing <span className="ml-2">→</span></Link><Link href="/markets" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Included sources</Link></>}
      />

      <section id="profile" className="min-w-0 scroll-mt-6 rounded-3xl border border-light-grey bg-white p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">1 · Business profile</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Describe what you sell and who buys it.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Use normal language. AI converts your products, services, customer types and exclusions into one relevance profile for the full Marketplace.</p>
        <div className="mt-6 min-w-0">
          {canEdit ? <CustomerProfileForm initial={profile} /> : <p className="rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit the business profile.</p>}
        </div>
      </section>

      {planViews.length === 0 && canEdit ? (
        <CoverageBuilder
          trades={tradeOptions}
          districts={districtOptions}
          existingTradeIds={[]}
          countyAreas={[]}
          trialMode
        />
      ) : (
        <CoveragePlanSelector initialPlan={initialPlan} hasCurrentPlan={Boolean(activeTier)} canEdit={canEdit} />
      )}

      {planViews.length > 0 && (
        <section>
          <AppSectionHeader eyebrow="Active plan" title="Current geographic reach." description="The coverage currently connected to this workspace." meta={<span className="rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">{planViews.length} active</span>} />
          <div className="grid gap-4 md:grid-cols-2">
            {planViews.map((plan) => <div key={plan.id} className="rounded-3xl border border-light-grey bg-white p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">{plan.coverageTier === "nationwide" ? "Nationwide reach" : humanizeStatus(plan.coverageTier) + " reach"}</p><p className="mt-1 text-xs leading-5 text-slate">{plan.coverageTier === "nationwide" ? "United Kingdom" : plan.districts.length > 0 ? plan.districts.join(", ") : "Geography pending"}</p></div><div className="text-left sm:text-right"><p className="text-lg font-bold text-charcoal">{formatMonthlyGbp(plan.monthlyPricePence)}</p><p className="text-xs text-slate">{humanizeStatus(plan.status)}</p></div></div></div>)}
          </div>
        </section>
      )}
    </div>
  );
}

function humanizeStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
