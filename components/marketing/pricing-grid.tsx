import Link from "next/link";
import { COVERAGE_PLANS, LEAD_UNLOCK_PRICE_GBP, formatMonthlyGbp } from "@/lib/coverage/pricing";

export interface PricingItem {
  slug: string;
  name: string;
  description?: string | null;
  monthlyPricePence: number;
}

export function PricingGrid({ compact = false }: { items?: PricingItem[]; compact?: boolean }) {
  return (
    <section id="pricing" className={compact ? "bg-white px-6 py-20 sm:py-24" : "px-6 py-12 sm:py-16"}>
      <div className="mx-auto max-w-7xl lg:px-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Simple pricing</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              Pay for coverage. Unlock only the opportunities you want.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate">
              Every plan includes the same intelligence engine and every relevant source. The monthly platform fee is based on geography, then each opportunity you choose to unlock is {LEAD_UNLOCK_PRICE_GBP}.
            </p>
          </div>
          {compact && (
            <Link href="/pricing" className="shrink-0 text-sm font-semibold text-signal-orange hover:text-[#e95f00]">
              See full pricing →
            </Link>
          )}
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {COVERAGE_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-3xl border p-6 ${plan.id === "regional" ? "border-signal-orange/40 bg-charcoal text-white shadow-xl shadow-charcoal/10" : "border-light-grey bg-soft-surface text-charcoal"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm font-semibold ${plan.id === "regional" ? "text-signal-orange" : "text-charcoal"}`}>{plan.name}</p>
                {plan.id === "regional" && <span className="rounded-full bg-signal-orange/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-signal-orange">Most flexible</span>}
              </div>
              <p className="mt-5 text-5xl font-bold tracking-tight">
                {formatMonthlyGbp(plan.monthlyPricePence)}<span className={`ml-1 text-base font-normal ${plan.id === "regional" ? "text-white/60" : "text-slate"}`}>/month</span>
              </p>
              <p className={`mt-3 min-h-[3rem] text-sm leading-6 ${plan.id === "regional" ? "text-white/70" : "text-slate"}`}>{plan.description}</p>
              <div className={`mt-6 border-t pt-5 ${plan.id === "regional" ? "border-white/10" : "border-light-grey"}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${plan.id === "regional" ? "text-white/50" : "text-slate"}`}>Choose one coverage shape</p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {plan.options.map((option) => <li key={option} className="flex gap-2"><span className="text-signal-orange">✓</span><span className={plan.id === "regional" ? "text-white/80" : "text-slate"}>{option}</span></li>)}
                </ul>
              </div>
              <div className={`mt-6 rounded-2xl p-4 ${plan.id === "regional" ? "bg-white/[0.07]" : "bg-white"}`}>
                <p className={`text-xs font-semibold ${plan.id === "regional" ? "text-white" : "text-charcoal"}`}>Included in every plan</p>
                <p className={`mt-1 text-xs leading-5 ${plan.id === "regional" ? "text-white/60" : "text-slate"}`}>All relevant opportunities identified by the intelligence engine.</p>
                <p className={`mt-2 text-xs font-semibold ${plan.id === "regional" ? "text-signal-orange" : "text-charcoal"}`}>{LEAD_UNLOCK_PRICE_GBP} per opportunity unlock</p>
              </div>
              <Link
                href="/signup"
                className={`mt-6 inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${plan.id === "regional" ? "bg-signal-orange text-white hover:bg-[#e95f00]" : "border border-signal-orange text-signal-orange hover:bg-signal-orange hover:text-white"}`}
              >
                Choose {plan.name}
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-7 grid gap-4 rounded-2xl border border-signal-orange/20 bg-signal-orange/[0.055] p-5 sm:grid-cols-2 sm:p-6">
          <div><p className="text-sm font-semibold text-charcoal">One platform, one intelligence engine</p><p className="mt-1 text-sm leading-6 text-slate">Every relevant source is included in your plan, with no vertical add-ons or forced lead bundles.</p></div>
          <div><p className="text-sm font-semibold text-charcoal">The only two charges</p><p className="mt-1 text-sm leading-6 text-slate">Your monthly geographic coverage fee and {LEAD_UNLOCK_PRICE_GBP} for each individual opportunity you decide to unlock.</p></div>
        </div>
      </div>
    </section>
  );
}
