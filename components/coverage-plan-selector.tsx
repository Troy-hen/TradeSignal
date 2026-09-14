"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COVERAGE_PLANS, type CoverageMode, type CoveragePlanId, getCoveragePlan, formatMonthlyGbp } from "@/lib/coverage/pricing";

const MODE_OPTIONS: Record<CoveragePlanId, Array<{ id: CoverageMode; label: string; description: string }>> = {
  local: [
    { id: "county", label: "One county", description: "A clear local administrative area." },
    { id: "places", label: "Towns or cities", description: "Choose the places your team serves." },
    { id: "radius", label: "Up to 25 miles", description: "A radius around your base." },
  ],
  regional: [
    { id: "county", label: "Up to 3 counties", description: "Neighbouring counties around your base." },
    { id: "places", label: "Larger place group", description: "A wider group of towns or cities." },
    { id: "radius", label: "Up to 75 miles", description: "A larger radius for regional teams." },
  ],
  nationwide: [{ id: "nationwide", label: "United Kingdom", description: "One national opportunity feed." }],
};

export function CoveragePlanSelector({
  initialPlan = "local",
  hasCurrentPlan = false,
  canEdit = true,
}: {
  initialPlan?: CoveragePlanId;
  hasCurrentPlan?: boolean;
  canEdit?: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<CoveragePlanId>(initialPlan);
  const options = useMemo(() => MODE_OPTIONS[selectedPlan], [selectedPlan]);
  const [mode, setMode] = useState<CoverageMode>(options[0].id);
  const plan = getCoveragePlan(selectedPlan) ?? COVERAGE_PLANS[0];
  const unchanged = hasCurrentPlan && selectedPlan === initialPlan;
  const billingHref = "/billing?plan=" + encodeURIComponent(selectedPlan) + "&mode=" + encodeURIComponent(mode);

  function choosePlan(nextPlan: CoveragePlanId) {
    setSelectedPlan(nextPlan);
    setMode(MODE_OPTIONS[nextPlan][0].id);
  }

  return (
    <section id="coverage-shape" className="rounded-3xl border border-light-grey bg-white p-5 shadow-[0_18px_50px_rgba(31,41,55,0.04)] sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">2 · Plan & geographic reach</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Choose how far the Marketplace should look.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Plans change geography only. Your business profile controls relevance across every included source and category.</p>
        </div>
        <div className="rounded-2xl bg-soft-surface px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">{unchanged ? "Current plan" : "Selected plan"}</p>
          <p className="mt-1 text-lg font-bold text-charcoal">{plan.name}</p>
          <p className="text-xs text-slate">{formatMonthlyGbp(plan.monthlyPricePence)} / month</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {COVERAGE_PLANS.map((item) => (
          <button key={item.id} type="button" onClick={() => choosePlan(item.id)} disabled={!canEdit} className={"rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 " + (selectedPlan === item.id ? "border-signal-orange bg-signal-orange/[0.06] shadow-sm" : "border-light-grey bg-soft-surface hover:border-signal-orange/40")}>
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-charcoal">{item.name}</span>{selectedPlan === item.id && <span className="h-2 w-2 rounded-full bg-signal-orange" />}</div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{formatMonthlyGbp(item.monthlyPricePence)}<span className="ml-1 text-xs font-normal text-slate">/month</span></p>
            <p className="mt-2 text-xs leading-5 text-slate">{item.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-light-grey bg-soft-surface p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Area shape</p><h3 className="mt-1.5 text-lg font-semibold text-charcoal">How should {plan.name.toLowerCase()} reach be defined?</h3></div><p className="text-sm font-semibold text-signal-orange">{formatMonthlyGbp(plan.monthlyPricePence)} / month</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">{options.map((option) => <button key={option.id} type="button" onClick={() => setMode(option.id)} disabled={!canEdit} className={"rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 " + (mode === option.id ? "border-signal-orange bg-white" : "border-transparent bg-white/70 hover:border-light-grey")}><span className="text-sm font-semibold text-charcoal">{option.label}</span><span className="mt-1 block text-xs leading-5 text-slate">{option.description}</span></button>)}</div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-light-grey pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-slate">
          {unchanged
            ? "This is the plan currently controlling your Marketplace reach."
            : "Review the selection in Billing before anything changes. Payment methods and invoices stay in the secure billing portal."}
        </p>
        {!canEdit
          ? <span className="rounded-xl bg-soft-surface px-4 py-2.5 text-sm font-semibold text-slate">Admin access required</span>
          : unchanged
            ? <Link href="/billing" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40">View billing</Link>
            : <Link href={billingHref} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">{hasCurrentPlan ? "Review plan change" : "Review plan"} <span className="ml-2">→</span></Link>}
      </div>
    </section>
  );
}
