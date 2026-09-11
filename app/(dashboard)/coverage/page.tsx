import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { CoveragePlanSelector } from "@/components/coverage-plan-selector";
import { CustomerProfileForm } from "@/components/customer-profile-form";
import { getCustomerProfile } from "@/lib/data/customer-profile";
import { AppPageHeader } from "@/components/app-page-header";
import { formatMonthlyGbp, LEAD_UNLOCK_PRICE_GBP } from "@/lib/coverage/pricing";

export default async function CoveragePage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const [{ data: plans }, profile] = await Promise.all([
    supabase.from("coverage_plans").select("id, status, billing_mode, monthly_price_pence, coverage_tier").eq("company_id", company.id).in("status", ["reserved", "active", "pending_change", "suspended"]).order("created_at"),
    getCustomerProfile(company.id),
  ]);
  const canEdit = company.role === "owner" || company.role === "admin";
  const planViews = await Promise.all((plans ?? []).map(async (plan) => {
    const { data: items } = await supabase.from("coverage_plan_items").select("postcode_district, status").eq("coverage_plan_id", plan.id).in("status", ["active", "pending_add"]).order("postcode_district");
    return { id: plan.id, status: plan.status, coverageTier: plan.coverage_tier ?? "local", monthlyPricePence: Number(plan.monthly_price_pence), districts: (items ?? []).map((item) => item.postcode_district) };
  }));
  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader eyebrow="Plan & profile" title="Choose your reach. Tell us what you sell." description="Describe what you sell, who you sell to and where you operate. Your profile controls relevance; your geographic plan controls reach. All available intelligence sources stay included." actions={<Link href="/territories" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Explore opportunity map <span className="ml-2">→</span></Link>} stats={[{ label: "Profile signal", value: "AI-normalised", detail: "Products, customers and exclusions" }, { label: "Geographic reach", value: "3 plans", detail: "Local, Regional or Nationwide" }, { label: "Unlock price", value: LEAD_UNLOCK_PRICE_GBP, detail: "Per individual opportunity" }]} />

      <section className="grid gap-5 rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-6 sm:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Your supplier profile</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Relevance starts with context.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate">Tell the engine what you sell, who you sell to, where you operate and what to leave out. AI turns that context into a relevance profile across all available sources.</p></div><div className="rounded-2xl border border-white bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Next step</p><p className="mt-2 text-sm font-semibold text-charcoal">Complete your profile, then activate coverage.</p><p className="mt-1 text-xs leading-5 text-slate">Your choices are not tied to a vertical or source subscription.</p><Link href="/settings?focus=profile" className="mt-4 inline-flex text-sm font-semibold text-signal-orange">Open business profile →</Link></div></section>

      <CoveragePlanSelector />

      <section id="profile" className="min-w-0 rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.035] p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Business profile</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Tell us what you sell.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Use normal language to describe your products or services, who you sell to and where you operate. AI normalises that context into relevance across the full marketplace.</p>
        <div className="mt-6 min-w-0">
          {canEdit ? <CustomerProfileForm initial={profile} /> : <p className="rounded-xl bg-white p-4 text-sm text-slate">Only company owners and admins can edit the business profile.</p>}
        </div>
      </section>

      {planViews.length > 0 && <section className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">Existing workspace coverage</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Current reach</h2><p className="mt-2 text-sm leading-6 text-slate">These records show the geographic reach currently connected to this workspace.</p></div>{planViews.map((plan) => <div key={plan.id} className="rounded-3xl border border-light-grey bg-white p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">{plan.coverageTier === "nationwide" ? "Nationwide reach" : "Coverage connected"}</p><p className="mt-1 text-xs text-slate">{plan.coverageTier === "nationwide" ? "United Kingdom" : plan.districts.length > 0 ? plan.districts.join(", ") : "Geography pending"}</p></div><div className="text-left sm:text-right"><p className="text-lg font-bold text-charcoal">{formatMonthlyGbp(plan.monthlyPricePence)}</p><p className="text-xs text-slate">{humanizeStatus(plan.status)}</p></div></div></div>)}</section>}

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">One reach model, many data sources</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate">You do not need to choose a market, vertical or source. The platform handles that behind the feed.</p></div><Link href="/markets" className="shrink-0 text-sm font-semibold text-signal-orange">View included sources →</Link></div></section>
    </div>
  );
}

function humanizeStatus(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
