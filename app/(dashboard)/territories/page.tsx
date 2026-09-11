import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TerritorySearchForm } from "@/components/territory-search-form";
import { OpportunityMap, type OpportunityMapPoint } from "@/components/opportunity-map";
import { getMarketSignalMapPoints } from "@/lib/data/opportunity-map";

export default async function TerritoriesPage() {
  const supabase = await createClient();
  const mapDb = supabase as unknown as { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: OpportunityMapPoint[] | null; error: unknown }> };
  const [{ data: trades }, { data: mapRows, error: mapError }, marketSignals] = await Promise.all([
    supabase.from("trade_categories").select("id, slug, name").eq("is_active", true).order("display_order"),
    mapDb.rpc("browse_opportunity_map_v2", { p_trade_slug: null, p_limit: 2000 }),
    getMarketSignalMapPoints(600),
  ]);
  if (mapError) console.error("planning opportunity map failed", mapError);

  const mapPoints = (mapRows ?? []).map((point) => ({
    ...point,
    opportunity_count: Number(point.opportunity_count),
    estimated_trade_value_low: Number(point.estimated_trade_value_low ?? 0),
    estimated_trade_value_high: Number(point.estimated_trade_value_high ?? 0),
    commercial_opportunity_count: Number(point.commercial_opportunity_count ?? 0),
    commercial_estimated_trade_value_low: Number(point.commercial_estimated_trade_value_low ?? 0),
    commercial_estimated_trade_value_high: Number(point.commercial_estimated_trade_value_high ?? 0),
    monthly_price_pence: Number(point.monthly_price_pence ?? 2999),
    teaser_estimated_trade_value_low: point.teaser_estimated_trade_value_low == null ? null : Number(point.teaser_estimated_trade_value_low),
    teaser_estimated_trade_value_high: point.teaser_estimated_trade_value_high == null ? null : Number(point.teaser_estimated_trade_value_high),
    commercial_teaser_estimated_trade_value_low: point.commercial_teaser_estimated_trade_value_low == null ? null : Number(point.commercial_teaser_estimated_trade_value_low),
    commercial_teaser_estimated_trade_value_high: point.commercial_teaser_estimated_trade_value_high == null ? null : Number(point.commercial_teaser_estimated_trade_value_high),
  }));

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Explore coverage</p><h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Find opportunity density where you can operate.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate sm:text-base">Use the map and preview to understand local signal. Your plan can then use a county, towns or cities, a radius or the whole UK — there is no postcode ownership or exclusivity.</p></div><Link href="/coverage" className="shrink-0 text-sm font-semibold text-signal-orange">Set up coverage →</Link></div>
      <div className="min-w-0 max-w-full overflow-hidden"><OpportunityMap points={mapPoints} signals={marketSignals} trades={trades ?? []} /></div>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start"><div className="min-w-0"><TerritorySearchForm trades={trades ?? []} /></div><section className="min-w-0 rounded-3xl bg-charcoal p-5 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Coverage journey</p><h2 className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl">Profile first. Geography second. Relevance throughout.</h2><p className="mt-4 text-sm leading-6 text-white/65 sm:text-base">MyTradeBox combines all enabled signal sources behind one feed. The coverage plan controls reach, while the customer profile controls which opportunities are worth showing.</p><div className="mt-7 space-y-4 border-t border-white/10 pt-6"><InfoRow number="01" title="Describe your business" body="Products, services, ideal customers, company size and exclusions." /><InfoRow number="02" title="Choose your geography" body="Local, Regional or Nationwide with the shape that fits your sales area." /><InfoRow number="03" title="Unlock what matters" body="Review the evidence and pay £20 only for an individual opportunity you want to work." /></div></section></div>
    </div>
  );
}

function InfoRow({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex min-w-0 gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-signal-orange">{number}</span><div className="min-w-0"><p className="break-words text-sm font-semibold text-white">{title}</p><p className="mt-1 break-words text-xs leading-5 text-white/55">{body}</p></div></div>; }
