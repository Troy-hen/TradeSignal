"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COVERAGE_PLANS, type CoverageMode, type CoveragePlanId, getCoveragePlan, formatMonthlyGbp, LEAD_UNLOCK_PRICE_GBP } from "@/lib/coverage/pricing";

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

export function CoveragePlanSelector({ initialPlan = "local" }: { initialPlan?: CoveragePlanId }) {
  const [selectedPlan, setSelectedPlan] = useState<CoveragePlanId>(initialPlan);
  const options = useMemo(() => MODE_OPTIONS[selectedPlan], [selectedPlan]);
  const [mode, setMode] = useState<CoverageMode>(options[0].id);
  const plan = getCoveragePlan(selectedPlan) ?? COVERAGE_PLANS[0];

  function choosePlan(nextPlan: CoveragePlanId) {
    setSelectedPlan(nextPlan);
    setMode(MODE_OPTIONS[nextPlan][0].id);
  }

  return (
    <section id="coverage-shape" className="rounded-3xl border border-light-grey bg-white p-6 shadow-[0_18px_50px_rgba(31,41,55,0.04)] sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Choose your reach</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">The plan is geography, not a vertical.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Every plan opens the same intelligence engine. Your profile decides relevance; this choice only controls how far the engine looks.</p></div><div className="rounded-2xl bg-signal-orange/10 px-4 py-3 text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Lead unlocks</p><p className="mt-1 text-xl font-bold text-charcoal">{LEAD_UNLOCK_PRICE_GBP}</p><p className="text-[11px] text-slate">per opportunity</p></div></div>

      <div className="mt-7 grid gap-3 md:grid-cols-3">{COVERAGE_PLANS.map((item) => <button key={item.id} type="button" onClick={() => choosePlan(item.id)} className={`rounded-2xl border p-4 text-left transition ${selectedPlan === item.id ? "border-signal-orange bg-signal-orange/[0.06] shadow-sm" : "border-light-grey bg-soft-surface hover:border-signal-orange/40"}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-charcoal">{item.name}</span>{selectedPlan === item.id && <span className="h-2 w-2 rounded-full bg-signal-orange" />}</div><p className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{formatMonthlyGbp(item.monthlyPricePence)}<span className="ml-1 text-xs font-normal text-slate">/month</span></p><p className="mt-2 text-xs leading-5 text-slate">{item.description}</p></button>)}</div>

      <div className="mt-7 rounded-2xl border border-light-grey bg-soft-surface p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">{plan.name} reach shape</p><h3 className="mt-2 text-lg font-semibold text-charcoal">How should we define your area?</h3></div><p className="text-sm font-semibold text-signal-orange">{formatMonthlyGbp(plan.monthlyPricePence)} / month</p></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{options.map((option) => <button key={option.id} type="button" onClick={() => setMode(option.id)} className={`rounded-xl border p-3 text-left transition ${mode === option.id ? "border-signal-orange bg-white" : "border-transparent bg-white/70 hover:border-light-grey"}`}><span className="text-sm font-semibold text-charcoal">{option.label}</span><span className="mt-1 block text-xs leading-5 text-slate">{option.description}</span></button>)}</div></div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-charcoal p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{plan.name} · {options.find((option) => option.id === mode)?.label}</p><p className="mt-1 text-xs leading-5 text-white/60">Complete your business profile next. All relevant opportunities remain included; unlocks are individual.</p></div><Link href="/coverage#profile" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Continue to profile →</Link></div>
    </section>
  );
}
