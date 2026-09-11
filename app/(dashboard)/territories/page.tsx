import Link from "next/link";
import { TerritorySearchForm } from "@/components/territory-search-form";
import { OpportunityMap, type OpportunityMapPoint } from "@/components/opportunity-map";
import { AppPageHeader } from "@/components/app-page-header";
import { getCanonicalOpportunityMapPoints, getMarketSignalMapPoints } from "@/lib/data/opportunity-map";

export default async function TerritoriesPage() {
  const [canonicalMapRows, marketSignals] = await Promise.all([
    getCanonicalOpportunityMapPoints(2000),
    getMarketSignalMapPoints(600),
  ]);
  const mapPoints = canonicalMapRows.map((point) => ({
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
      <AppPageHeader eyebrow="Map discovery" title="See opportunity density across your reach." description="The map is a discovery layer for the marketplace. Compare business change, commercial change and public signals, then open the feed to review teasers and unlock the leads that matter." actions={<><Link href="/opportunities" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Open marketplace <span className="ml-2">→</span></Link><Link href="/coverage" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Manage coverage</Link></>} />
      <div className="min-w-0 max-w-full overflow-hidden"><OpportunityMap points={mapPoints} signals={marketSignals} /></div>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start"><div className="min-w-0"><TerritorySearchForm /></div><section className="min-w-0 rounded-3xl border border-light-grey bg-white p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">How to use the map</p><h2 className="mt-4 break-words text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">Profile first. Geography second. Marketplace next.</h2><p className="mt-4 text-sm leading-6 text-slate sm:text-base">Your business description controls relevance. Your Local, Regional or Nationwide plan controls geography. The map helps you spot concentration; the marketplace helps you decide what to unlock.</p><div className="mt-7 space-y-4 border-t border-light-grey pt-6"><InfoRow number="01" title="Describe what you sell" body="Use free text. The engine normalises services, buyer types and likely needs." /><InfoRow number="02" title="Explore density" body="Compare all available signal layers without choosing a vertical or buying a source." /><InfoRow number="03" title="Unlock deliberately" body="Open the marketplace teaser and pay £20 only when a lead is worth working." /></div></section></div>
    </div>
  );
}

function InfoRow({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex min-w-0 gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-signal-orange/10 text-xs font-bold text-signal-orange">{number}</span><div className="min-w-0"><p className="break-words text-sm font-semibold text-charcoal">{title}</p><p className="mt-1 break-words text-xs leading-5 text-slate">{body}</p></div></div>; }
