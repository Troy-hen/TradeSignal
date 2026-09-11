import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { formatMonthlyGbp } from "@/lib/coverage/pricing";

export default async function MyCoveragePage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("coverage_plans")
    .select("id, status, monthly_price_pence, billing_mode")
    .eq("company_id", company.id)
    .in("status", ["reserved", "active", "pending_change", "suspended"])
    .order("created_at", { ascending: false });

  const planViews = await Promise.all((plans ?? []).map(async (plan) => {
    const { data: items } = await supabase
      .from("coverage_plan_items")
      .select("postcode_district, status")
      .eq("coverage_plan_id", plan.id)
      .in("status", ["active", "pending_add"])
      .order("postcode_district");
    return {
      id: plan.id,
      status: plan.status,
      billingMode: plan.billing_mode,
      monthlyPricePence: Number(plan.monthly_price_pence ?? 0),
      districts: (items ?? []).map((item) => item.postcode_district),
    };
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Coverage summary</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Your active reach.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
            Review the geography currently connected to your account. Coverage controls where the engine looks; your profile controls which opportunities it prioritises.
          </p>
        </div>
        <Link href="/coverage" className="shrink-0 text-sm font-semibold text-signal-orange hover:text-[#e95f00]">Manage coverage →</Link>
      </div>

      {planViews.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-signal-orange/30 bg-signal-orange/[0.04] p-8 text-center sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">No active geography yet</p>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-charcoal">Choose how far the engine should look.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate">Local, Regional and Nationwide use the same intelligence engine. All relevant opportunities remain included; individual lead unlocks are £20.</p>
          <Link href="/coverage" className="mt-5 inline-flex rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Set up coverage →</Link>
        </section>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {planViews.map((plan) => (
            <li key={plan.id} className="rounded-3xl border border-light-grey bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">Connected coverage</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">{labelForPlan(plan.billingMode)}</h2>
                  <p className="mt-1 text-sm text-slate">{plan.districts.length > 0 ? plan.districts.join(", ") : "Geography is being prepared"}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl font-bold text-charcoal">{formatMonthlyGbp(plan.monthlyPricePence)}</p>
                  <p className="text-xs text-slate">{humanize(plan.status)} · monthly</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Opportunity access" value="Included" />
                <Metric label="Lead unlock" value="£20 each" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-charcoal">Need to change the shape?</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate">Switch between county, selected towns or cities, radius, and UK-wide reach from Coverage. There are no separate vertical or source subscriptions.</p>
          </div>
          <Link href="/coverage" className="shrink-0 text-sm font-semibold text-signal-orange hover:text-[#e95f00]">Open Coverage →</Link>
        </div>
      </section>
    </div>
  );
}

function labelForPlan(value: string | null) {
  if (value === "county") return "Local coverage";
  if (value === "places") return "Place-based coverage";
  if (value === "radius") return "Radius coverage";
  if (value === "nationwide") return "Nationwide coverage";
  return "Coverage plan";
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-light-grey bg-soft-surface p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-1 text-sm font-bold text-charcoal">{value}</p></div>;
}
