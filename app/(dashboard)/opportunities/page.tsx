import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities, type OpportunityActionFilter } from "@/lib/data/opportunities";
import { getOwnedMarketSignals } from "@/lib/data/trade-intelligence";
import { listPaidLeadUnlocks } from "@/lib/data/lead-unlocks";
import { OpportunityRow } from "@/components/opportunity-row";
import { MarketSignalRow } from "@/components/market-signal-row";
import { AppPageHeader } from "@/components/app-page-header";
import type { Database } from "@/lib/types/database";

type OpportunityBucket = Database["public"]["Enums"]["opportunity_bucket"];
const BUCKETS = [
  ["", "All", "Everything matched"],
  ["hot", "Hot", "90+ score"],
  ["strong", "Warm", "75–89 score"],
  ["possible", "Early", "50–74 score"],
  ["low", "Developing", "Below 50"],
] as const;
const SOURCES = [["", "All intelligence"], ["planning", "Business change"], ["tender", "Tenders"], ["public_pipeline", "Public pipeline"], ["contract_award", "Awards"], ["commercial_development", "Commercial change"]] as const;
const ACTIONS = [["", "All stages"], ["new", "New"], ["saved", "Saved"], ["contacted", "Contacted"], ["quoted", "Quoted"], ["won", "Won"], ["lost", "Lost"]] as const;
type SourceFilter = (typeof SOURCES)[number][0];
type ActionFilter = (typeof ACTIONS)[number][0];

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ bucket?: string; action?: string; source?: string }> }) {
  const company = await requireCurrentCompany();
  const { bucket, action, source } = await searchParams;
  const selectedBucket = BUCKETS.some(([value]) => value === bucket) ? bucket ?? "" : "";
  const selectedAction: ActionFilter = ACTIONS.some(([value]) => value === action) ? action as ActionFilter : "";
  const selectedSource: SourceFilter = SOURCES.some(([value]) => value === source) ? source as SourceFilter : "";
  const savedView = selectedAction === "saved";
  const planningAction = selectedAction && ["new", "saved", "contacted", "quoted", "won", "lost"].includes(selectedAction) ? selectedAction as OpportunityActionFilter : undefined;
  const supabase = await createClient();
  const [{ data: activeClaims }, { data: activePlans }, planningRaw, marketRaw, paidUnlocks] = await Promise.all([
    supabase.from("territory_claims").select("id").eq("company_id", company.id).eq("status", "active").limit(1),
    supabase.from("coverage_plans").select("id").eq("company_id", company.id).in("status", ["reserved", "active", "pending_change"]).limit(1),
    selectedSource === "tender" || selectedSource === "public_pipeline" || selectedSource === "contract_award" ? Promise.resolve([]) : getCompanyOpportunities(company.id, { bucket: selectedBucket ? selectedBucket as OpportunityBucket : undefined, action: planningAction, limit: 300 }),
    selectedSource === "planning" ? Promise.resolve([]) : getOwnedMarketSignals(300),
    listPaidLeadUnlocks(company.id),
  ]);

  const marketSignals = marketRaw.filter((item) => {
    if (selectedSource && selectedSource !== "planning" && selectedSource !== "commercial_development" && item.signal_type !== selectedSource) return false;
    if (selectedSource === "commercial_development" && item.signal_type !== "commercial_development") return false;
    if (selectedBucket && item.opportunity_bucket !== selectedBucket) return false;
    if (selectedAction && item.current_action !== selectedAction) return false;
    return true;
  });
  const planning = selectedSource === "commercial_development" ? planningRaw.filter((item) => item.isCommercial === true) : planningRaw;
  const totalCount = planning.length + marketSignals.length;
  const hasCoverage = (activeClaims?.length ?? 0) > 0 || (activePlans?.length ?? 0) > 0;
  const paidOpportunityIds = new Set(paidUnlocks.map((unlock) => unlock.application_trade_opportunity_id).filter((value): value is string => Boolean(value)));
  const paidMarketSignalIds = new Set(paidUnlocks.map((unlock) => unlock.market_signal_trade_match_id).filter((value): value is string => Boolean(value)));
  const openCount = [...planning.map((item) => item.currentAction), ...marketSignals.map((item) => item.current_action)].filter((value) => !["won", "lost"].includes(value ?? "")).length;
  const hotCount = planning.filter((item) => item.bucket === "hot").length + marketSignals.filter((item) => item.opportunity_bucket === "hot").length;
  const filtered = Boolean(selectedBucket || selectedSource || (selectedAction && !savedView));

  const hrefFor = (overrides: { bucket?: string; action?: string; source?: string }) => {
    const params = new URLSearchParams();
    const nextBucket = overrides.bucket !== undefined ? overrides.bucket : selectedBucket;
    const nextAction = overrides.action !== undefined ? overrides.action : selectedAction;
    const nextSource = overrides.source !== undefined ? overrides.source : selectedSource;
    if (nextBucket) params.set("bucket", nextBucket);
    if (nextAction) params.set("action", nextAction);
    if (nextSource) params.set("source", nextSource);
    return params.toString() ? `/opportunities?${params}` : "/opportunities";
  };

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader
        eyebrow={savedView ? "Saved workspace" : "Marketplace"}
        title={savedView ? "Your saved opportunities." : "The next best opportunity is here."}
        description={savedView ? "Keep the signals worth revisiting in one quiet workspace. Return to the marketplace when you are ready to find something new." : "Every relevant source in one feed. Review the teaser, understand why now and unlock only the individual leads worth your time."}
        actions={savedView ? <Link href="/opportunities" className="inline-flex items-center justify-center rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-charcoal/90">Back to marketplace <span className="ml-2">→</span></Link> : <><Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Back to dashboard</Link><Link href="/coverage" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Manage coverage <span className="ml-2">→</span></Link></>}
        stats={savedView ? [{ label: "Saved leads", value: String(totalCount), detail: "Shortlisted to revisit" }, { label: "Purchased", value: String(paidUnlocks.length), detail: "Permanent access" }] : [{ label: "Open opportunities", value: String(openCount), detail: "Ready to qualify" }, { label: "Hot now", value: String(hotCount), detail: "Strongest current fit" }, { label: "Purchased leads", value: String(paidUnlocks.length), detail: "Permanent access" }, { label: "Visible matches", value: String(totalCount), detail: "Across your coverage" }]}
      />

      {savedView ? <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">Your shortlist</p><p className="mt-1 text-xs leading-5 text-slate">Saved items stay separate from the live feed so follow-up work is easy to find.</p></div><Link href="/opportunities" className="shrink-0 text-sm font-semibold text-signal-orange">Find more opportunities →</Link></div><div className="mt-5 flex flex-wrap gap-2 border-t border-light-grey pt-4">{BUCKETS.map(([value, label, helper]) => <Link key={value} href={hrefFor({ bucket: value })} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${selectedBucket === value ? "border-charcoal bg-charcoal text-white" : "border-light-grey bg-white text-charcoal hover:border-charcoal/30"}`}><span>{label}</span><span className={selectedBucket === value ? "text-white/60" : "text-slate"}>{helper}</span></Link>)}</div></section> : <FeedControls selectedSource={selectedSource} selectedBucket={selectedBucket} selectedAction={selectedAction} hrefFor={hrefFor} />}

      {totalCount === 0 ? <EmptyState hasCoverage={hasCoverage} filtered={filtered} savedView={savedView} /> : <div className="space-y-8">{planning.length > 0 && <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-orange">{savedView ? "Saved business opportunities" : "Business opportunities"}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-charcoal">{savedView ? "Your shortlisted buying windows." : "Signals matched to your profile."}</h2></div><span className="text-xs text-slate">{planning.length}</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{planning.map((item) => <OpportunityRow key={item.leadMatchId} item={item} unlocked={paidOpportunityIds.has(item.opportunityId)} />)}</div></section>}{marketSignals.length > 0 && <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-orange">{savedView ? "Saved public signals" : "Additional intelligence"}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-charcoal">{savedView ? "Signals you chose to keep close." : "Public, commercial and procurement signals."}</h2></div><span className="text-xs text-slate">{marketSignals.length}</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{marketSignals.map((item) => <MarketSignalRow key={item.market_signal_trade_match_id} item={item} unlocked={paidMarketSignalIds.has(item.market_signal_trade_match_id)} />)}</div></section>}</div>}
    </div>
  );
}

function FeedControls({ selectedSource, selectedBucket, selectedAction, hrefFor }: { selectedSource: SourceFilter; selectedBucket: string; selectedAction: ActionFilter; hrefFor: (overrides: { bucket?: string; action?: string; source?: string }) => string }) {
  return <section className="rounded-3xl border border-light-grey bg-white p-4 sm:p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">Shape the feed</p><p className="mt-1 text-xs text-slate">Your profile chooses relevance. These filters help you work the queue.</p></div><p className="text-xs font-medium text-slate">Use Saved for your shortlist</p></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{SOURCES.map(([value, label]) => <Link key={value} href={hrefFor({ source: value })} className={`min-w-max rounded-xl border px-3 py-2 text-sm font-semibold transition ${selectedSource === value ? "border-signal-orange bg-signal-orange text-white" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}>{label}</Link>)}</div><div className="mt-4 flex gap-2 overflow-x-auto border-t border-light-grey pt-4 pb-1">{BUCKETS.map(([value, label, helper]) => <Link key={value} href={hrefFor({ bucket: value })} className={`flex min-w-max items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${selectedBucket === value ? "border-charcoal bg-charcoal text-white" : "border-light-grey bg-white text-charcoal hover:border-charcoal/30"}`}><span>{label}</span><span className={selectedBucket === value ? "text-white/60" : "text-slate"}>{helper}</span></Link>)}</div><div className="mt-4 flex flex-wrap gap-2 border-t border-light-grey pt-4">{ACTIONS.map(([value, label]) => <Link key={value} href={hrefFor({ action: value })} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${selectedAction === value ? "border-charcoal bg-charcoal text-white" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}>{label}</Link>)}</div></section>;
}

function EmptyState({ hasCoverage, filtered, savedView }: { hasCoverage: boolean; filtered: boolean; savedView: boolean }) {
  const title = savedView ? "Nothing saved yet." : hasCoverage ? filtered ? "Nothing matches these filters." : "The marketplace is warming up." : "Choose your coverage to open the marketplace.";
  const body = savedView ? "Save an opportunity from the marketplace and it will appear here for follow-up." : hasCoverage ? filtered ? "Clear the filters to return to the complete relevant feed." : "New relevant opportunities will appear here as the intelligence engine qualifies them." : "Tell us what you sell and where you operate. Geography controls reach; the profile controls relevance.";
  return <div className="rounded-3xl border border-dashed border-light-grey bg-white p-10 text-center sm:p-14"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-orange/10 text-xl text-signal-orange">{savedView ? "♡" : "✦"}</div><h2 className="mt-5 text-lg font-semibold text-charcoal">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">{body}</p>{savedView ? <Link href="/opportunities" className="mt-5 inline-flex rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white">Browse marketplace →</Link> : hasCoverage && filtered ? <Link href="/opportunities" className="mt-5 inline-flex rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white">Clear filters</Link> : !hasCoverage ? <Link href="/coverage" className="mt-5 inline-flex rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white">Set up coverage →</Link> : null}</div>;
}
