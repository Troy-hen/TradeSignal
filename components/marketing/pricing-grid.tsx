import Link from "next/link";

export interface PricingItem {
  slug: string;
  name: string;
  description?: string | null;
  monthlyPricePence: number;
}

const PRICING_TIERS = [
  {
    label: "First postcode district",
    price: "£29.99",
    detail: "Your starting district in any trade category",
  },
  {
    label: "Districts 2–3",
    price: "£24.99",
    detail: "Each additional district in the same trade plan",
  },
  {
    label: "Districts 4–6",
    price: "£19.99",
    detail: "Each additional district in the same trade plan",
  },
  {
    label: "Districts 7–10",
    price: "£14.99",
    detail: "Each additional district in the same trade plan",
  },
  {
    label: "District 11+",
    price: "£9.99",
    detail: "Each additional district in the same trade plan",
  },
] as const;

export function PricingGrid({ compact = false }: { items?: PricingItem[]; compact?: boolean }) {
  return (
    <section id="pricing" className={compact ? "bg-white px-6 py-20 sm:py-24" : "px-6 py-12 sm:py-16"}>
      <div className="mx-auto max-w-7xl lg:px-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Transparent pricing</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              One price for every trade. Pay less as coverage grows.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate">
              The price is the same whether you are a builder, roofer, electrician or another trade. Start with one postcode district, then add coverage around your service area at automatically lower unit prices.
            </p>
          </div>
          {compact && (
            <Link href="/pricing" className="shrink-0 text-sm font-semibold text-signal-orange hover:text-[#e95f00]">
              See coverage pricing →
            </Link>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-success/20 bg-success/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-charcoal">Free Explorer · £0/month</p>
            <p className="mt-1 text-sm leading-6 text-slate">
              Preview local planning activity, counts, estimated value and territory availability before you buy. No card required.
            </p>
          </div>
          <Link
            href="/territories"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-success/30 px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-white"
          >
            Explore free
          </Link>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.65fr)]">
          <article className="flex flex-col rounded-2xl border border-signal-orange/30 bg-charcoal p-6 text-white">
            <p className="text-sm font-semibold text-signal-orange">Universal starting price</p>
            <p className="mt-5 text-5xl font-bold tracking-tight">
              £29.99<span className="ml-1 text-base font-normal text-white/60">/month</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Your first postcode district in any trade category. No trade or territory surcharge.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              <li>• Exclusive access for your business</li>
              <li>• Planning activity, scores and indicative values</li>
              <li>• Add or remove districts as your service area changes</li>
            </ul>
            <Link
              href="/territories"
              className="mt-7 inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
            >
              Check an area
            </Link>
          </article>

          <div className="rounded-2xl border border-light-grey bg-soft-surface p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-charcoal">Automatic volume pricing</p>
                <p className="mt-1 text-sm leading-6 text-slate">
                  Discounting applies to the additional districts within each trade coverage plan.
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Monthly</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {PRICING_TIERS.map((tier) => (
                <div key={tier.label} className="rounded-2xl border border-light-grey bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">{tier.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{tier.price}</p>
                  <p className="mt-1 text-xs text-slate">per month</p>
                  <p className="mt-4 text-xs leading-5 text-slate">{tier.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-signal-orange/20 bg-signal-orange/5 p-4">
              <p className="text-sm font-semibold text-charcoal">County coverage</p>
              <p className="mt-1 text-sm leading-6 text-slate">
                Once verified county coverage is enabled for your area, county bundles receive 20% off the tiered postcode subtotal. You keep control of the individual districts in the bundle and can adjust coverage to fit your budget.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-4xl text-sm leading-6 text-slate">
          Pricing is per trade coverage plan. General Builder is one broad trade view, not an all-trades bundle: adding a specialist trade such as roofing or plumbing starts a separate plan at the same £29.99 first-district price. Volume discounts then apply within each trade. The same postcode district can therefore be relevant to and purchased by multiple trades, while each trade&apos;s feed stays focused.
        </p>
      </div>
    </section>
  );
}
