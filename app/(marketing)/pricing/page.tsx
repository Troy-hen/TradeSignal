import type { Metadata } from "next";
import Link from "next/link";
import { PricingGrid } from "@/components/marketing/pricing-grid";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple monthly pricing for exclusive MyTradeBox trade territories.",
};

export default function PricingPage() {
  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Pricing</p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Preview free. Own a local patch from £29.99/month.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Explore the local signal at £0, then start at £29.99/month for your first postcode district, regardless of trade or location. Add only the live districts around your service area and the unit price reduces automatically as your coverage grows. The same district can be owned by different trades, so your coverage stays relevant rather than becoming a forced three-postcode bundle.
          </p>
        </div>
      </section>

      <PricingGrid />

      <section className="bg-white px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3 lg:px-2">
          <InfoCard title="Explore before you commit" body="Use the free public checker to preview local planning activity, aggregate totals, indicative value and territory availability. Upgrade only when you want exclusive access to the opportunity feed." />
          <InfoCard title="What is included" body="Exclusive access to your trade-specific opportunity feed, live aggregate totals, planning context, indicative value, source links and practical next actions." />
          <InfoCard title="Choose your own coverage" body="There is no forced three-postcode pack. Select any live districts you actually serve, remove them when your budget or service area changes, and let the volume price recalculate automatically." />
          <InfoCard title="How coverage pricing works" body="Every trade starts at the same £29.99 for its first postcode district. Add or remove districts inside that trade plan and the unit price steps down by volume. Once verified county coverage is enabled for your area, county bundles receive an additional 20% discount." />
          <InfoCard title="What is not promised" body="Planning applications can change, estimates are indicative and a signal is not a guaranteed enquiry. MyTradeBox helps you find and prioritise opportunities earlier." />
        </div>
      </section>

      <section className="bg-soft-surface px-6 py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border border-signal-orange/20 bg-signal-orange/5 p-7 sm:p-9 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-charcoal">See what is available in your area.</p>
            <p className="mt-1 text-sm leading-6 text-slate">Preview the local signal first, then decide whether the territory is worth owning.</p>
          </div>
          <Link href="/territories" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white hover:bg-[#e95f00]">
            Check availability
          </Link>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-light-grey bg-soft-surface p-6">
      <h2 className="text-base font-semibold text-charcoal">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate">{body}</p>
    </article>
  );
}
