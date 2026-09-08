import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_PRICING, PricingGrid, type PricingItem } from "@/components/marketing/pricing-grid";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple monthly pricing for exclusive MyTradeBox trade territories.",
};

async function getPricing(): Promise<PricingItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("trade_categories")
      .select("slug, name, description, default_monthly_price_pence")
      .eq("is_active", true)
      .order("display_order");

    if (data && data.length > 0) {
      return data.map((trade) => ({
        slug: trade.slug,
        name: trade.name,
        description: trade.description,
        monthlyPricePence: trade.default_monthly_price_pence,
      }));
    }
  } catch {
    // The marketing page has a safe fallback when the data service is unavailable.
  }

  return FALLBACK_PRICING;
}

export default async function PricingPage() {
  const pricing = await getPricing();

  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-4xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Pricing</p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Pay for the local signal you can act on.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            No credit packs and no shared lead auction. Choose a trade, check a postcode district and see the monthly price before you claim it.
          </p>
        </div>
      </section>

      <PricingGrid items={pricing} />

      <section className="bg-white px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3 lg:px-2">
          <InfoCard title="What is included" body="Exclusive access to your trade-specific opportunity feed, live aggregate totals, planning context, indicative value and the tools to decide what to pursue." />
          <InfoCard title="How coverage works" body="The live product starts with one trade × one postcode district. Adjacent district packs are planned for firms whose service area is larger than a single postcode." />
          <InfoCard title="What is not promised" body="Planning applications can change, estimates are indicative and a signal is not a guaranteed enquiry. MyTradeBox helps you find and prioritise opportunities earlier." />
        </div>
      </section>

      <section className="bg-soft-surface px-6 py-16">
        <div className="mx-auto flex max-w-4xl flex-col gap-5 rounded-3xl border border-signal-orange/20 bg-signal-orange/5 p-7 sm:p-9 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-charcoal">See what is available in your area.</p>
            <p className="mt-1 text-sm leading-6 text-slate">Preview the local signal first, then decide whether the territory is worth owning.</p>
          </div>
          <a href="/territories" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white hover:bg-[#e95f00]">
            Check availability
          </a>
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
