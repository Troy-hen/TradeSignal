import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TerritorySearchForm } from "@/components/territory-search-form";
import { OpportunityMap, type OpportunityMapPoint } from "@/components/opportunity-map";
import { getMarketSignalMapPoints } from "@/lib/data/opportunity-map";

export default async function TerritoriesPage() {
  const supabase = await createClient();
  const mapDb = supabase as unknown as { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: OpportunityMapPoint[] | null; error: unknown }> };
  const [{ data: mapRows, error: mapError }, marketSignals] = await Promise.all([
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
    <div className="min-w-0 space-y-8"><div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Map discovery</p><h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">See opportunity density across your reach.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate sm:text-base">The map is a discovery layer for the marketplace. Compare business change, commercial change and public signals, then open the feed to review teasers and unlock the leads that matter.</p></div><Link href="/coverage" className="shrink-0 text-sm font-semibold text-signal-orange">Manage coverage →</Link></div><div className="min-w-0 max-w-full overflow-hidden"><OpportunityMap points={mapPoints} signals={marketSignals} /></div><div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start"><div className="min-w-0"><TerritorySearchForm /></div><section className="min-w-0 rounded-3xl bg-charcoal p-5 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">How to use the map</p><h2 className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl">Profile first. Geography second. Marketplace next.</h2><p className="mt-4 text-sm leading-6 text-white/65 sm:text-base">Your business description controls relevance. Your Local, Regional or Nationwide plan controls the geography. The map helps you spot concentration; the marketplace helps you decide what to unlock.</p><div className="mt-7 space-y-4 border-t border-white/10 pt-6"><InfoRow number="01" title="Describe what you sell" body="Use free text. The engine normalises services, buyer types and likely needs." /><InfoRow number="02" title="Explore density" body="Compare all available signal layers without choosing a vertical or buying a source." /><InfoRow number="03" title="Unlock deliberately" body="Open the marketplace teaser and pay £20 only when a lead is worth working." /></div></section></div></div>
  );
}

function InfoRow({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex min-w-0 gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-signal-orange">{number}</span><div className="min-w-0"><p className="break-words text-sm font-semibold text-white">{title}</p><p className="mt-1 break-words text-xs leading-5 text-white/55">{body}</p></div></div>; }
