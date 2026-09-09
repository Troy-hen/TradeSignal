import { createClient } from "@/lib/supabase/server";
import { TerritorySearchForm } from "@/components/territory-search-form";
import { OpportunityMap, type OpportunityMapPoint } from "@/components/opportunity-map";

export default async function TerritoriesPage() {
  const supabase = await createClient();
  const { data: trades } = await supabase
    .from("trade_categories")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("display_order");

  const mapDb = supabase as unknown as {
    rpc: (
      functionName: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: OpportunityMapPoint[] | null; error: unknown }>;
  };
  const { data: mapRows } = await mapDb.rpc("browse_opportunity_map", {
    p_trade_slug: null,
    p_limit: 2000,
  });
  const mapPoints = (mapRows ?? []).map((point) => ({
    ...point,
    opportunity_count: Number(point.opportunity_count),
    estimated_trade_value_low: Number(point.estimated_trade_value_low ?? 0),
    estimated_trade_value_high: Number(point.estimated_trade_value_high ?? 0),
    monthly_price_pence: Number(point.monthly_price_pence ?? 2999),
    teaser_estimated_trade_value_low:
      point.teaser_estimated_trade_value_low === null || point.teaser_estimated_trade_value_low === undefined
        ? null
        : Number(point.teaser_estimated_trade_value_low),
    teaser_estimated_trade_value_high:
      point.teaser_estimated_trade_value_high === null || point.teaser_estimated_trade_value_high === undefined
        ? null
        : Number(point.teaser_estimated_trade_value_high),
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Territory Explorer</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Find the right patch.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
          Search a loaded postcode district and trade to see local planning activity, estimated value and whether the
          exclusive territory is available. Build a wider service area from Coverage once you know what works.
        </p>
      </div>

      <OpportunityMap points={mapPoints} trades={trades ?? []} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <TerritorySearchForm trades={trades ?? []} />

        <section className="rounded-3xl bg-charcoal p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">How territories work</p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Start with one district. Expand when the signal earns it.</h2>
          <p className="mt-4 text-sm leading-6 text-white/65 sm:text-base">
            MyTradeBox keeps each trade feed exclusive by postcode district, then lets you group the districts you actually serve into one coverage plan.
          </p>
          <div className="mt-7 space-y-4 border-t border-white/10 pt-6">
            <InfoRow number="01" title="Check the local signal" body="See recent applications, priority and estimated trade value." />
            <InfoRow number="02" title="Claim the territory" body="Reserve the area for your trade before another business does." />
            <InfoRow number="03" title="Work the opportunities" body="Open the full brief, make contact and track the outcome." />
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-signal-orange">{number}</span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/55">{body}</p>
      </div>
    </div>
  );
}
