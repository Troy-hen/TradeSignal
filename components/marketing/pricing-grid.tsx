import Link from "next/link";

export interface PricingItem {
  slug: string;
  name: string;
  description?: string | null;
  monthlyPricePence: number;
}

export const FALLBACK_PRICING: PricingItem[] = [
  { slug: "general-builder", name: "General Builder", description: "Extensions, conversions and whole-project builds", monthlyPricePence: 9900 },
  { slug: "groundworks", name: "Groundworks", description: "Excavation, foundations, drainage and site preparation", monthlyPricePence: 7900 },
  { slug: "roofing", name: "Roofing", description: "Re-roofing, roof extensions and roofline work", monthlyPricePence: 7900 },
  { slug: "structural-steel", name: "Structural Steel", description: "Steel beams and structural alterations", monthlyPricePence: 6900 },
  { slug: "windows-doors", name: "Windows & Doors", description: "Replacement and new windows, doors and glazing", monthlyPricePence: 6900 },
  { slug: "landscaping", name: "Landscaping", description: "Gardens, patios, boundaries and external works", monthlyPricePence: 5900 },
  { slug: "electrical", name: "Electrical", description: "Rewiring, consumer units, EV charging and new circuits", monthlyPricePence: 7900 },
  { slug: "plumbing-heating", name: "Plumbing & Heating", description: "Boilers, heating systems, bathrooms and heat pumps", monthlyPricePence: 7900 },
  { slug: "brickwork", name: "Brickwork", description: "Blockwork, brickwork and masonry", monthlyPricePence: 6900 },
  { slug: "demolition", name: "Demolition", description: "Full or partial demolition and strip-out", monthlyPricePence: 5900 },
  { slug: "loft-conversion", name: "Loft Conversion", description: "Loft conversions and roof-space development", monthlyPricePence: 6900 },
  { slug: "driveways", name: "Driveways", description: "Driveways, hardstanding and parking areas", monthlyPricePence: 5900 },
  { slug: "renewables", name: "Renewables", description: "Solar PV, heat pumps and renewable installations", monthlyPricePence: 6900 },
];

function formatMonthlyPrice(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

export function PricingGrid({ items, compact = false }: { items: PricingItem[]; compact?: boolean }) {
  const visibleItems = compact ? items.slice(0, 4) : items;

  return (
    <section id="pricing" className={compact ? "bg-white px-6 py-20 sm:py-24" : "px-6 py-12 sm:py-16"}>
      <div className="mx-auto max-w-7xl lg:px-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Transparent pricing</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              One clear monthly price for your trade area.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate">
              Current pricing is based on one trade category in one postcode district. The exact territory price is confirmed when you check an area.
            </p>
          </div>
          {compact && (
            <Link href="/pricing" className="shrink-0 text-sm font-semibold text-signal-orange hover:text-[#e95f00]">
              See all trade pricing →
            </Link>
          )}
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleItems.map((item) => (
            <article key={item.slug} className="flex flex-col rounded-2xl border border-light-grey bg-soft-surface p-5">
              <p className="text-sm font-semibold text-charcoal">{item.name}</p>
              <p className="mt-2 min-h-12 text-xs leading-5 text-slate">{item.description}</p>
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate">From</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-charcoal">
                  {formatMonthlyPrice(item.monthlyPricePence)}
                  <span className="ml-1 text-sm font-normal text-slate">/mo</span>
                </p>
              </div>
              <div className="mt-5 border-t border-light-grey pt-4 text-xs leading-5 text-slate">
                Exclusive to one business in the selected postcode district.
              </div>
              <Link
                href="/territories"
                className="mt-5 inline-flex items-center justify-center rounded-xl border border-signal-orange px-3 py-2.5 text-xs font-semibold text-signal-orange transition hover:bg-signal-orange hover:text-white"
              >
                Check an area
              </Link>
            </article>
          ))}
        </div>

        {compact && (
          <p className="mt-6 text-sm leading-6 text-slate">
            Wider coverage is the next step: we will offer sensible packs of adjacent districts for businesses that cover a city or county, rather than forcing every builder to buy areas one at a time.
          </p>
        )}
      </div>
    </section>
  );
}
