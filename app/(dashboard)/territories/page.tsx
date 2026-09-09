import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TerritorySearchForm } from "@/components/territory-search-form";
import { OpportunityMap, type OpportunityMapPoint } from "@/components/opportunity-map";

export default async function TerritoriesPage() {
  const supabase = await createClient();
  const { data: trades } = await supabase.from("trade_categories").select("id, slug, name").eq("is_active", true).order("display_order");
  const mapDb = supabase as unknown as { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: OpportunityMapPoint[] | null; error: unknown }> };
  const { data: mapRows } = await mapDb.rpc("browse_opportunity_map", { p_trade_slug: null, p_limit: 2000 });
  const mapPoints = (mapRows ?? []).map((point) => ({ ...point, opportunity_count: Number(point.opportunity_count), estimated_trade_value_low: Number(point.estimated_trade_value_low ?? 0), estimated_trade_value_high: Number(point.estimated_trade_value_high ?? 0), monthly_price_pence: Number(point.monthly_price_pence ?? 2999), teaser_estimated_trade_value_low: point.teaser_estimated_trade_value_low == null ? null : Number(point.teaser_estimated_trade_value_low), teaser_estimated_trade_value_high: point.teaser_estimated_trade_value_high == null ? null : Number(point.teaser_estimated_trade_value_high) }));

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Explore territories</p><h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Find the right patch.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate sm:text-base">Use this page to discover and validate new postcode districts before you buy. Once you own an area, manage it from My coverage.</p></div>
        <Link href="/coverage" className="shrink-0 text-sm font-semibold text-signal-orange">Go to My coverage →</Link>
      </div>
      <div className="min-w-0 max-w-full overflow-hidden"><OpportunityMap points={mapPoints} trades={trades ?? []} /></div>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0"><TerritorySearchForm trades={trades ?? []} /></div>
        <section className="min-w-0 rounded-3xl bg-charcoal p-5 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Discovery journey</p><h2 className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl">Explore here. Manage owned areas in My coverage.</h2><p className="mt-4 text-sm leading-6 text-white/65 sm:text-base">MyTradeBox keeps each trade feed exclusive by postcode district. Preview the local signal first, claim only the areas that make sense, then manage the resulting service area separately.</p><div className="mt-7 space-y-4 border-t border-white/10 pt-6"><InfoRow number="01" title="Explore the signal" body="See recent applications, priority and estimated trade value." /><InfoRow number="02" title="Claim the territory" body="Reserve the postcode district for your trade before another business does." /><InfoRow number="03" title="Manage My coverage" body="Add or remove owned districts and keep the monthly total visible." /></div></section>
      </div>
    </div>
  );
}
function InfoRow({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex min-w-0 gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-signal-orange">{number}</span><div className="min-w-0"><p className="break-words text-sm font-semibold text-white">{title}</p><p className="mt-1 break-words text-xs leading-5 text-white/55">{body}</p></div></div>; }
