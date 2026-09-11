import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { CoveragePlanSelector } from "@/components/coverage-plan-selector";
import { formatMonthlyGbp, LEAD_UNLOCK_PRICE_GBP } from "@/lib/coverage/pricing";

export default async function CoveragePage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const { data: plans } = await supabase.from("coverage_plans").select("id, status, billing_mode, monthly_price_pence").eq("company_id", company.id).in("status", ["reserved", "active", "pending_change", "suspended"]).order("created_at");
  const planViews = await Promise.all((plans ?? []).map(async (plan) => {
    const { data: items } = await supabase.from("coverage_plan_items").select("postcode_district, status").eq("coverage_plan_id", plan.id).in("status", ["active", "pending_add"]).order("postcode_district");
    return { id: plan.id, status: plan.status, monthlyPricePence: Number(plan.monthly_price_pence), districts: (items ?? []).map((item) => item.postcode_district) };
  }));
  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Coverage & profile</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Tell the engine where to look.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate sm:text-base">Describe what you sell, who you sell to and where you operate. Your profile controls relevance; your coverage plan controls geography. All available intelligence sources stay included.</p></div><Link href="/territories" className="shrink-0 text-sm font-semibold text-signal-orange">Explore opportunity map →</Link></div>

      <section className="grid gap-4 md:grid-cols-3"><SummaryCard label="Profile signal" value="Business-led" detail="Products, customers and exclusions" /><SummaryCard label="Coverage choices" value="3 plans" detail="Local, Regional or Nationwide" /><SummaryCard label="Unlock price" value={LEAD_UNLOCK_PRICE_GBP} detail="Per individual opportunity" /></section>

      <section className="grid gap-5 rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-6 sm:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Your customer profile</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Relevance starts with context.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate">Tell the engine what you sell, who you sell to, where you operate and what to leave out. AI turns that context into a relevance profile across all available sources.</p></div><div className="rounded-2xl border border-white bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Next step</p><p className="mt-2 text-sm font-semibold text-charcoal">Complete your profile, then activate coverage.</p><p className="mt-1 text-xs leading-5 text-slate">Your choices are not tied to a vertical or source subscription.</p><Link href="/settings?focus=profile" className="mt-4 inline-flex text-sm font-semibold text-signal-orange">Open business profile →</Link></div></section>

      <CoveragePlanSelector />

      {planViews.length > 0 && <section className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">Existing workspace coverage</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Connected geography</h2><p className="mt-2 text-sm leading-6 text-slate">These records come from the current coverage connection. The new plan model will consolidate them into one geography-based subscription.</p></div>{planViews.map((plan) => <div key={plan.id} className="rounded-3xl border border-light-grey bg-white p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">Coverage connected</p><p className="mt-1 text-xs text-slate">{plan.districts.length > 0 ? plan.districts.join(", ") : "Geography pending"}</p></div><div className="text-left sm:text-right"><p className="text-lg font-bold text-charcoal">{formatMonthlyGbp(plan.monthlyPricePence)}</p><p className="text-xs text-slate">{humanizeStatus(plan.status)}</p></div></div></div>)}</section>}

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">One coverage model, many data sources</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate">You do not need to decide whether a signal came from planning, tenders, property, business change or enrichment. The platform handles that behind the feed.</p></div><Link href="/markets" className="shrink-0 text-sm font-semibold text-signal-orange">View included sources →</Link></div></section>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-light-grey bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{value}</p><p className="mt-1 text-xs leading-5 text-slate">{detail}</p></div>; }
function humanizeStatus(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
