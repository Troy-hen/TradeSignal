import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { getOwnedMarketSignals } from "@/lib/data/trade-intelligence";
import { OpportunityRow } from "@/components/opportunity-row";
import { MarketSignalRow } from "@/components/market-signal-row";
import type { Database } from "@/lib/types/database";
import type { OpportunityActionFilter } from "@/lib/data/opportunities";

type OpportunityBucket = Database["public"]["Enums"]["opportunity_bucket"];
const BUCKETS: { value: OpportunityBucket | ""; label: string; helper: string }[] = [
  { value: "", label: "All", helper: "Everything matched" }, { value: "hot", label: "Hot", helper: "90+ score" }, { value: "strong", label: "Strong", helper: "75–89 score" }, { value: "possible", label: "Possible", helper: "50–74 score" }, { value: "low", label: "Low", helper: "Below 50" },
];
const SOURCES = [
  ["", "All intelligence"], ["planning", "Planning"], ["tender", "Tenders"], ["public_pipeline", "Public pipeline"], ["contract_award", "Awards"], ["commercial_development", "Commercial builds"],
] as const;
const BUYERS = [["", "All buyers"], ["local_authority", "Local authority"]] as const;
const ACTIONS = [
  ["", "All stages"], ["new", "New"], ["saved", "Saved"], ["contacted", "Contacted"], ["bid_planned", "Bid planned"], ["bid_submitted", "Bid submitted"], ["quoted", "Quoted"], ["won", "Won"], ["lost", "Lost"],
] as const;
type SourceFilter = (typeof SOURCES)[number][0];
type BuyerFilter = (typeof BUYERS)[number][0];
type ActionFilter = (typeof ACTIONS)[number][0];
const VALID_BUCKETS = new Set<string>(["hot", "strong", "possible", "low"]);
const VALID_SOURCES = new Set<string>(SOURCES.map(([value]) => value));
const VALID_BUYERS = new Set<string>(BUYERS.map(([value]) => value));
const VALID_ACTIONS = new Set<string>(ACTIONS.map(([value]) => value));
const PLANNING_ACTIONS = new Set<string>(["new", "saved", "contacted", "quoted", "won", "lost"]);

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ bucket?: string; action?: string; source?: string; buyer?: string }> }) {
  const company = await requireCurrentCompany();
  const { bucket, action, source, buyer } = await searchParams;
  const selectedBucket = bucket && VALID_BUCKETS.has(bucket) ? bucket : "";
  const selectedAction: ActionFilter = action && VALID_ACTIONS.has(action) ? action as ActionFilter : "";
  const selectedSource: SourceFilter = source && VALID_SOURCES.has(source) ? source as SourceFilter : "";
  const selectedBuyer: BuyerFilter = buyer && VALID_BUYERS.has(buyer) ? buyer as BuyerFilter : "";
  const planningAction = selectedAction && PLANNING_ACTIONS.has(selectedAction) ? selectedAction as OpportunityActionFilter : undefined;
  const supabase = await createClient();
  const planningSourceSelected = !selectedSource || selectedSource === "planning" || selectedSource === "commercial_development";

  const [{ data: activeClaims }, planningRaw, marketRaw] = await Promise.all([
    supabase.from("territory_claims").select("id").eq("company_id", company.id).eq("status", "active").limit(1),
    selectedBuyer || selectedAction.startsWith("bid_") || !planningSourceSelected
      ? Promise.resolve([])
      : getCompanyOpportunities(company.id, { bucket: selectedBucket ? selectedBucket as OpportunityBucket : undefined, action: planningAction, limit: 300 }),
    selectedSource === "planning" ? Promise.resolve([]) : getOwnedMarketSignals(300),
  ]);

  const marketSignals = marketRaw.filter((item) => {
    if (selectedSource && item.signal_type !== selectedSource) return false;
    if (selectedBucket && item.opportunity_bucket !== selectedBucket) return false;
    if (selectedAction && item.current_action !== selectedAction) return false;
    if (selectedBuyer === "local_authority" && !isLocalAuthorityBuyer(item.buyer_name)) return false;
    return true;
  });
  const planning = selectedSource === "commercial_development"
    ? planningRaw.filter((item) => item.isCommercial === true)
    : planningRaw;
  const totalCount = planning.length + marketSignals.length;
  const hasActiveClaims = (activeClaims?.length ?? 0) > 0;
  const filtered = Boolean(selectedBucket || selectedAction || selectedSource || selectedBuyer);

  const exportParams = new URLSearchParams();
  if (selectedBucket) exportParams.set("bucket", selectedBucket);
  if (planningAction) exportParams.set("action", planningAction);
  const exportHref = `/api/opportunities/export${exportParams.toString() ? "?" + exportParams.toString() : ""}`;

  const hrefFor = (overrides: { bucket?: string; action?: string; source?: string; buyer?: string }) => {
    const params = new URLSearchParams();
    const nextBucket = overrides.bucket !== undefined ? overrides.bucket : selectedBucket;
    const nextAction = overrides.action !== undefined ? overrides.action : selectedAction;
    const nextSource = overrides.source !== undefined ? overrides.source : selectedSource;
    const nextBuyer = overrides.buyer !== undefined ? overrides.buyer : selectedBuyer;
    if (nextBucket) params.set("bucket", nextBucket);
    if (nextAction) params.set("action", nextAction);
    if (nextSource) params.set("source", nextSource);
    if (nextBuyer) params.set("buyer", nextBuyer);
    return params.toString() ? `/opportunities?${params}` : "/opportunities";
  };

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Trade intelligence feed</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Work worth chasing.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate sm:text-base">Planning applications, public-sector pipeline, live tenders, contract awards and commercial developments matched to the trade territories you own.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
          <a href={exportHref} className="inline-flex items-center justify-center rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange">Export planning CSV ↓</a>
          <Link href="/territories" className="inline-flex items-center justify-center rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-orange">Explore territories <span className="ml-2">→</span></Link>
        </div>
      </div>

      <section className="rounded-3xl border border-light-grey bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">One feed, multiple intelligence layers</p><p className="mt-1 text-xs text-slate">Filter by source, buyer type, commercial strength or workflow stage. Commercial builds include commercial planning opportunities now, while regional public-sector notices are included only where delivery overlaps territory you own for the same trade.</p></div><p className="text-xs font-medium text-slate">{totalCount} {totalCount === 1 ? "opportunity" : "opportunities"}</p></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{SOURCES.map(([value, label]) => <Link key={value} href={hrefFor({ source: value })} className={`min-w-max rounded-xl border px-3 py-2 text-sm font-semibold transition ${selectedSource === value ? "border-signal-orange bg-signal-orange text-white" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}>{label}</Link>)}</div>
        <div className="mt-4 flex gap-2 overflow-x-auto border-t border-light-grey pt-4 pb-1">{BUYERS.map(([value, label]) => <Link key={value} href={hrefFor({ buyer: value })} className={`min-w-max rounded-xl border px-3 py-2 text-sm font-semibold transition ${selectedBuyer === value ? "border-signal-orange bg-signal-orange/10 text-signal-orange" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}>{label}</Link>)}</div>
        <div className="mt-4 flex gap-2 overflow-x-auto border-t border-light-grey pt-4 pb-1">{BUCKETS.map((item) => <Link key={item.value} href={hrefFor({ bucket: item.value })} className={`flex min-w-max items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${selectedBucket === item.value ? "border-charcoal bg-charcoal text-white" : "border-light-grey bg-white text-charcoal hover:border-charcoal/30"}`}><span>{item.label}</span><span className={selectedBucket === item.value ? "text-white/60" : "text-slate"}>{item.helper}</span></Link>)}</div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-light-grey pt-4">{ACTIONS.map(([value, label]) => <Link key={value} href={hrefFor({ action: value })} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${selectedAction === value ? "border-charcoal bg-charcoal text-white" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}>{label}</Link>)}</div>
      </section>

      {totalCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-light-grey bg-white p-10 text-center sm:p-14">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-orange/10 text-xl text-signal-orange">✦</div>
          {hasActiveClaims ? <><h2 className="mt-5 text-lg font-semibold text-charcoal">{filtered ? "Nothing matches these filters." : "No new trade opportunities in your coverage yet."}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">{filtered ? "Clear the filters to return to your complete intelligence feed." : "MyTradeBox will keep watching planning, procurement and commercial signals across your patch."}</p>{filtered && <Link href="/opportunities" className="mt-5 inline-flex rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white">Clear filters</Link>}</> : <><h2 className="mt-5 text-lg font-semibold text-charcoal">Claim a territory to unlock your trade intelligence feed.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">Choose a postcode district and trade to start monitoring local work across multiple signal sources.</p><Link href="/territories" className="mt-5 inline-flex rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white">Explore your first territory →</Link></>}
        </div>
      ) : (
        <div className="space-y-6">
          {planning.length > 0 && <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate">{selectedSource === "commercial_development" ? "Commercial planning opportunities" : "Planning opportunities"}</h2><span className="text-xs text-slate">{planning.length}</span></div><ul className="space-y-3">{planning.map((item) => <li key={item.leadMatchId}><OpportunityRow item={item} /></li>)}</ul></section>}
          {marketSignals.length > 0 && <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate">Public & commercial intelligence</h2><span className="text-xs text-slate">{marketSignals.length}</span></div><ul className="space-y-3">{marketSignals.map((item) => <li key={item.market_signal_trade_match_id}><MarketSignalRow item={item} /></li>)}</ul></section>}
        </div>
      )}
    </div>
  );
}

function isLocalAuthorityBuyer(value: string | null) {
  if (!value) return false;
  return /\b(council|borough|combined authority|local authority)\b/i.test(value);
}
