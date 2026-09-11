import type { Metadata } from "next";
import Link from "next/link";
import { PricingGrid } from "@/components/marketing/pricing-grid";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple geography-based TradeSignal pricing with £20 individual opportunity unlocks.",
};

export default function PricingPage() {
  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Pricing</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">One platform fee. One £20 unlock price.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">Choose the geography you need: Local, Regional or Nationwide. Every plan includes the same intelligence engine and all relevant opportunities; you pay £20 only when you choose to unlock an individual lead.</p>
        </div>
      </section>

      <PricingGrid />

      <section className="bg-white px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3 lg:px-2">
          <InfoCard title="What does the platform fee cover?" body="Geographic reach. Local covers one county, selected towns or cities, or up to a 25-mile radius. Regional expands that to up to three neighbouring counties, a larger place group or 75 miles. Nationwide covers the UK." />
          <InfoCard title="What is included?" body="All relevant opportunities identified across the enabled intelligence sources. Your business profile tells the engine what to prioritise; you never need to buy a source or choose a vertical." />
          <InfoCard title="What does £20 unlock?" body="A successful individual unlock gives you the complete opportunity profile, evidence, decision-maker enrichment where available and the tools to save, export or push the lead to your CRM." />
          <InfoCard title="Are opportunities exclusive?" body="No. The same opportunity can be relevant to more than one customer. The product is built around relevance, evidence and a fair individual unlock rather than postcode ownership." />
          <InfoCard title="Are lead bundles required?" body="No. There are no forced packs, vertical add-ons or separate market subscriptions. The only charges are geographic platform access and the individual unlocks you choose." />
          <InfoCard title="Can I preview before paying?" body="Yes. The public checker and protected opportunity previews let you judge the signal before subscribing or unlocking a lead. Values and signals are indicative, not promises of work." />
        </div>
      </section>

      <section className="bg-soft-surface px-6 py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border border-signal-orange/20 bg-signal-orange/5 p-7 sm:p-9 md:flex-row md:items-center md:justify-between">
          <div><p className="text-lg font-semibold text-charcoal">Ready to describe your coverage?</p><p className="mt-1 text-sm leading-6 text-slate">Tell us what you sell, who you sell to and where you operate. The intelligence engine handles relevance.</p></div>
          <Link href="/signup" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white hover:bg-[#e95f00]">Create your account</Link>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return <article className="rounded-2xl border border-light-grey bg-soft-surface p-6"><h2 className="text-base font-semibold text-charcoal">{title}</h2><p className="mt-3 text-sm leading-6 text-slate">{body}</p></article>;
}
