import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities, type OpportunityActionFilter } from "@/lib/data/opportunities";
import { getOwnedMarketSignals } from "@/lib/data/trade-intelligence";
import { getMarketSignalMapPoints } from "@/lib/data/opportunity-map";
import { getCustomerProfile } from "@/lib/data/customer-profile";
import { rankByCustomerProfile } from "@/lib/profile/relevance";
import { listPaidLeadUnlocks } from "@/lib/data/lead-unlocks";
import { OpportunityRow } from "@/components/opportunity-row";
import { MarketSignalRow } from "@/components/market-signal-row";
import { OpportunityMap, type OpportunityMapPoint } from "@/components/opportunity-map";
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
const SOURCES = [
  ["", "All intelligence"],
  ["planning", "Business change"],
  ["tender", "Tenders"],
  ["public_pipeline", "Public pipeline"],
  ["contract_award", "Awards"],
  ["commercial_development", "Commercial change"],
] as const;
const ACTIONS = [
  ["", "All stages"],
  ["new", "New"],
  ["saved", "Saved"],
  ["contacted", "Contacted"],
  ["quoted", "Quoted"],
  ["won", "Won"],
  ["lost", "Lost"],
] as const;
type SourceFilter = (typeof SOURCES)[number][0];
type ActionFilter = (typeof ACTIONS)[number][0];
type MarketplaceView = "list" | "map";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; action?: string; source?: string; view?: string }>;
}) {
  const company = await requireCurrentCompany();
  const { bucket, action, source, view } = await searchParams;
  const selectedBucket = BUCKETS.some(([value]) => value === bucket) ? bucket ?? "" : "";
  const selectedAction: ActionFilter = ACTIONS.some(([value]) => value === action) ? action as ActionFilter : "";
  const selectedSource: SourceFilter = SOURCES.some(([value]) => value === source) ? source as SourceFilter : "";
  const selectedView: MarketplaceView = view === "map" ? "map" : "list";
  const savedView = selectedAction === "saved";
  const planningAction = selectedAction && ["new", "saved", "contacted", "quoted", "won", "lost"].includes(selectedAction)
    ? selectedAction as OpportunityActionFilter
    : undefined;
  const supabase = await createClient();

  const [{ data: activeClaims }, { data: activePlans }, planningRaw, marketRaw, paidUnlocks, profile] = await Promise.all([
    supabase.from("territory_claims").select("id").eq("company_id", company.id).eq("status", "active").limit(1),
    supabase.from("coverage_plans").select("id").eq("company_id", company.id).in("status", ["reserved", "active", "pending_change"]).limit(1),
    selectedSource === "tender" || selectedSource === "public_pipeline" || selectedSource === "contract_award"
      ? Promise.resolve([])
      : getCompanyOpportunities(company.id, {
          bucket: selectedBucket ? selectedBucket as OpportunityBucket : undefined,
          action: planningAction,
          limit: 1000,
        }),
    selectedSource === "planning" ? Promise.resolve([]) : getOwnedMarketSignals(600),
    listPaidLeadUnlocks(company.id),
    getCustomerProfile(company.id),
  ]);

  const rankedMarketSignals = rankByCustomerProfile(
    marketRaw.filter((item) => {
      if (selectedSource && selectedSource !== "planning" && selectedSource !== "commercial_development" && item.signal_type !== selectedSource) return false;
      if (selectedSource === "commercial_development" && item.signal_type !== "commercial_development") return false;
      if (selectedBucket && item.opportunity_bucket !== selectedBucket) return false;
      if (selectedAction && item.current_action !== selectedAction) return false;
      return true;
    }),
    profile,
    (item) => [item.title, item.trade_name, item.recommended_action, item.location_label, item.buyer_name].filter(Boolean).join(" "),
  );

  const paidOpportunityIds = new Set(
    paidUnlocks
      .map((unlock) => unlock.application_trade_opportunity_id)
      .filter((value): value is string => Boolean(value)),
  );
  const paidMarketSignalIds = new Set(
    paidUnlocks.map((unlock) => unlock.market_signal_trade_match_id).filter((value): value is string => Boolean(value)),
  );
  const unpurchasedPlanning = planningRaw.filter((item) => !(item.underlyingOpportunityIds ?? [item.opportunityId]).some((id) => paidOpportunityIds.has(id)));
  const visiblePlanning = selectedSource === "commercial_development"
    ? unpurchasedPlanning.filter((item) => item.isCommercial)
    : unpurchasedPlanning;
  const visibleMarketSignals = rankedMarketSignals.filter((item) => !paidMarketSignalIds.has(item.market_signal_trade_match_id));
  const hasCoverage = (activeClaims?.length ?? 0) > 0 || (activePlans?.length ?? 0) > 0;
  const totalCount = visiblePlanning.length + visibleMarketSignals.length;
  const openCount = [...visiblePlanning.map((item) => item.currentAction), ...visibleMarketSignals.map((item) => item.current_action)]
    .filter((value) => !["won", "lost"].includes(value ?? "")).length;
  const hotCount = visiblePlanning.filter((item) => item.bucket === "hot").length + visibleMarketSignals.filter((item) => item.opportunity_bucket === "hot").length;
  const filtered = Boolean(selectedBucket || selectedSource || (selectedAction && !savedView));
  const mapPlanningPoints = toMapPoints(visiblePlanning);
  const mapSignalRows = selectedView === "map" ? await getMarketSignalMapPoints(600) : [];
  const visibleSignalIds = new Set(visibleMarketSignals.map((item) => item.market_signal_trade_match_id));
  const mapSignals = mapSignalRows.filter((item) => visibleSignalIds.has(item.market_signal_trade_match_id));

  const hrefFor = (overrides: { bucket?: string; action?: string; source?: string; view?: MarketplaceView }) => {
    const params = new URLSearchParams();
    const nextBucket = overrides.bucket !== undefined ? overrides.bucket : selectedBucket;
    const nextAction = overrides.action !== undefined ? overrides.action : selectedAction;
    const nextSource = overrides.source !== undefined ? overrides.source : selectedSource;
    const nextView = overrides.view !== undefined ? overrides.view : selectedView;
    if (nextBucket) params.set("bucket", nextBucket);
    if (nextAction) params.set("action", nextAction);
    if (nextSource) params.set("source", nextSource);
    if (nextView === "map") params.set("view", nextView);
    return params.toString() ? "/opportunities?" + params.toString() : "/opportunities";
  };

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader
        eyebrow={savedView ? "Saved shortlist" : "Marketplace"}
        title={savedView ? "Your saved opportunities." : "The next best opportunity is here."}
        description={savedView
          ? "Keep the signals worth revisiting in one quiet workspace. Purchased leads leave this queue and stay in Purchased leads."
          : "One profile-filtered feed across every enabled source. Review the teaser, understand why now and unlock only the individual opportunities worth your time."}
        actions={savedView
          ? <><Link href="/opportunities" className="inline-flex items-center justify-center rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-charcoal/90">Back to marketplace <span className="ml-2">→</span></Link><Link href="/purchased" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Purchased leads</Link></>
          : <><Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Back to dashboard</Link><Link href="/purchased" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Purchased leads</Link><Link href="/coverage#profile" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Plan & profile <span className="ml-2">→</span></Link></>}
        stats={savedView
          ? [{ label: "Saved leads", value: String(totalCount), detail: "Shortlisted to revisit" }, { label: "Purchased", value: String(paidUnlocks.length), detail: "Permanent access" }]
          : [{ label: "Open opportunities", value: String(openCount), detail: "Ready to qualify" }, { label: "Hot now", value: String(hotCount), detail: "Strongest current fit" }, { label: "Purchased leads", value: String(paidUnlocks.length), detail: "Permanent access" }, { label: "Visible matches", value: String(totalCount), detail: "Across your reach" }]}
      />

      <MarketplaceToolbar
        selectedSource={selectedSource}
        selectedBucket={selectedBucket}
        selectedAction={selectedAction}
        selectedView={selectedView}
        filtered={Boolean(selectedBucket || selectedSource || selectedAction)}
        hrefFor={hrefFor}
      />

      {totalCount === 0
        ? <EmptyState hasCoverage={hasCoverage} filtered={filtered} savedView={savedView} />
        : selectedView === "map"
          ? <OpportunityMap points={mapPlanningPoints} signals={mapSignals} />
          : <div className="space-y-8">
              {visiblePlanning.length > 0 && <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-orange">{savedView ? "Saved business-change opportunities" : "Business-change opportunities"}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-charcoal">{savedView ? "Your shortlisted buying windows." : "Opportunities matched to your profile."}</h2></div><span className="text-xs text-slate">{visiblePlanning.length}</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visiblePlanning.map((item) => <OpportunityRow key={item.canonicalOpportunityId ?? item.opportunityId} item={item} unlocked={false} />)}</div></section>}
              {visibleMarketSignals.length > 0 && <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-orange">{savedView ? "Saved public and commercial opportunities" : "Public and commercial opportunities"}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-charcoal">{savedView ? "Opportunities you chose to keep close." : "Tenders, pipelines, awards and commercial change."}</h2></div><span className="text-xs text-slate">{visibleMarketSignals.length}</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleMarketSignals.map((item) => <MarketSignalRow key={item.market_signal_trade_match_id} item={item} unlocked={false} />)}</div></section>}
            </div>}
    </div>
  );
}

function MarketplaceToolbar({
  selectedSource,
  selectedBucket,
  selectedAction,
  selectedView,
  filtered,
  hrefFor,
}: {
  selectedSource: SourceFilter;
  selectedBucket: string;
  selectedAction: ActionFilter;
  selectedView: MarketplaceView;
  filtered: boolean;
  hrefFor: (overrides: { bucket?: string; action?: string; source?: string; view?: MarketplaceView }) => string;
}) {
  return (
    <section className="rounded-2xl border border-light-grey bg-white p-3 shadow-[0_8px_30px_rgba(31,41,55,0.035)]">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <form action="/opportunities" className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
          {selectedView === "map" && <input type="hidden" name="view" value="map" />}
          <FilterSelect label="Source" name="source" value={selectedSource} options={SOURCES.map(([value, label]) => ({ value, label }))} />
          <FilterSelect label="Priority" name="bucket" value={selectedBucket} options={BUCKETS.map(([value, label]) => ({ value, label }))} />
          <FilterSelect label="Stage" name="action" value={selectedAction} options={ACTIONS.map(([value, label]) => ({ value, label }))} />
          <button type="submit" className="h-10 rounded-xl bg-charcoal px-4 text-sm font-semibold text-white transition hover:bg-charcoal/90">Apply</button>
          {filtered && <Link href={selectedView === "map" ? "/opportunities?view=map" : "/opportunities"} className="inline-flex h-10 items-center px-2 text-xs font-semibold text-slate hover:text-charcoal">Clear</Link>}
        </form>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-light-grey pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
          <span className="text-xs font-medium text-slate">View</span>
          <div className="flex rounded-xl border border-light-grey bg-soft-surface p-1" aria-label="Marketplace view">
            <Link href={hrefFor({ view: "list" })} className={"rounded-lg px-4 py-2 text-sm font-semibold transition " + (selectedView === "list" ? "bg-white text-charcoal shadow-sm" : "text-slate hover:text-charcoal")}>Cards</Link>
            <Link href={hrefFor({ view: "map" })} className={"rounded-lg px-4 py-2 text-sm font-semibold transition " + (selectedView === "map" ? "bg-charcoal text-white shadow-sm" : "text-slate hover:text-charcoal")}>Map</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value: string; options: Array<{ value: string; label: string }> }) {
  return <label className="min-w-[145px] flex-1 sm:max-w-[210px]"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</span><select name={name} defaultValue={value} className="h-10 w-full rounded-xl border border-light-grey bg-soft-surface px-3 text-sm font-semibold text-charcoal outline-none transition focus:border-signal-orange focus:ring-2 focus:ring-signal-orange/15">{options.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}</select></label>;
}

function EmptyState({ hasCoverage, filtered, savedView }: { hasCoverage: boolean; filtered: boolean; savedView: boolean }) {
  return (
    <section className="rounded-3xl border border-light-grey bg-white p-8 text-center sm:p-12">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-orange">{savedView ? "Shortlist empty" : "No matching opportunities yet"}</p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{savedView ? "Nothing saved here yet." : filtered ? "Try another filter." : hasCoverage ? "Your next buying window is still forming." : "Choose a reach plan to open the marketplace."}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate">{savedView ? "Save an opportunity from the marketplace when you want to revisit it." : hasCoverage ? "Update your free-text business profile or broaden your geographic reach to change what appears here." : "Your profile controls relevance and Local, Regional or Nationwide controls geography."}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/coverage#profile" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white">Update profile</Link><Link href="/coverage" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal">Manage reach</Link></div>
    </section>
  );
}

function toMapPoints(items: Array<{
  opportunityId: string;
  canonicalOpportunityId?: string;
  district: string;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  score: number | null;
  projectType: string | null;
  planningStatus: string;
  valueLow: number | null;
  valueHigh: number | null;
  summary: string | null;
  matchedNeeds?: string[];
  likelyRequirements?: string[];
  signalFamily?: string | null;
  sourceKind?: string | null;
}>): OpportunityMapPoint[] {
  return items.flatMap((item) => {
    if (item.latitude === null || item.latitude === undefined || item.longitude === null || item.longitude === undefined) return [];
    const postTown = item.locationLabel?.split(" · ")[1] ?? item.district;
    return [{
      postcode_district: item.district,
      post_town: postTown,
      latitude: item.latitude,
      longitude: item.longitude,
      opportunity_count: 1,
      estimated_trade_value_low: item.valueLow ?? 0,
      estimated_trade_value_high: item.valueHigh ?? 0,
      trade_category_id: "unified",
      trade_name: "Relevant opportunities",
      trade_slug: "unified",
      territory_status: "available",
      monthly_price_pence: 0,
      teaser_opportunity_id: item.opportunityId,
      teaser_project_type: item.projectType,
      teaser_status: item.planningStatus,
      teaser_estimated_trade_value_low: item.valueLow,
      teaser_estimated_trade_value_high: item.valueHigh,
      teaser_summary: item.summary,
      teaser_score: item.score,
      teaser_needs: [...(item.matchedNeeds ?? []), ...(item.likelyRequirements ?? [])],
      teaser_source: item.sourceKind ?? item.signalFamily ?? "Unified intelligence",
    }];
  });
}
