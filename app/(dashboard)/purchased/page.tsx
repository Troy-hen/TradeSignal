import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { getMarketSignalForLeadUnlock, type OwnedMarketSignal } from "@/lib/data/trade-intelligence";
import { listPaidLeadUnlocks, type LeadUnlockRow } from "@/lib/data/lead-unlocks";
import { OpportunityRow } from "@/components/opportunity-row";
import { MarketSignalRow } from "@/components/market-signal-row";
import { AppPageHeader } from "@/components/app-page-header";

export default async function PurchasedLeadsPage() {
  const company = await requireCurrentCompany();
  const [allPlanning, unlocks] = await Promise.all([
    getCompanyOpportunities(company.id, { limit: 500 }),
    listPaidLeadUnlocks(company.id),
  ]);
  const allMarketSignals = await getMarketSignalForLeadUnlocks(unlocks);

  const purchasedOpportunityIds = new Set(unlocks.map((unlock) => unlock.application_trade_opportunity_id).filter((value): value is string => Boolean(value)));
  const purchasedMarketSignalIds = new Set(unlocks.map((unlock) => unlock.market_signal_trade_match_id).filter((value): value is string => Boolean(value)));
  const purchasedPlanning = allPlanning.filter((item) => purchasedOpportunityIds.has(item.opportunityId));
  const purchasedMarketSignals = allMarketSignals.filter((item) => purchasedMarketSignalIds.has(item.market_signal_trade_match_id));
  const categoryUsage = buildCategoryUsage(unlocks);

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader
        eyebrow="Purchased leads"
        title="Your unlocked opportunities."
        description="Every lead you unlock stays here as a working record. Open the full brief for the contact route, evidence, recommended next move and optional CRM handoff."
        actions={<><Link href="/opportunities" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Find more opportunities <span className="ml-2">→</span></Link><Link href="/crm" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">CRM connections</Link></>}
        stats={[
          { label: "Purchased", value: String(unlocks.length), detail: "Individual leads unlocked" },
          { label: "Contact-ready", value: String(purchasedPlanning.length + purchasedMarketSignals.length), detail: "Full briefs available" },
          { label: "Unlock price", value: "£20", detail: "Per opportunity" },
        ]}
      />

      <section className="rounded-3xl border border-success/20 bg-success/[0.035] p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">Your lead library</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Unlimited categories. Individual lead unlocks.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">The marketplace removes an unlocked lead from your active feed, while this page keeps its full record available. There is no per-category allowance or vertical lock.</p>
          </div>
          <span className="shrink-0 rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-charcoal shadow-sm">{unlocks.length} total</span>
        </div>
        {categoryUsage.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoryUsage.map((item) => <div key={item.key} className="rounded-2xl border border-white bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-charcoal">{item.label}</p><span className="text-xs font-bold text-signal-orange">{item.count}</span></div><p className="mt-2 text-[11px] text-slate">Purchased lead{item.count === 1 ? "" : "s"} in this category</p></div>)}
          </div>
        ) : <p className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate">Your first unlocked lead will appear here.</p>}
      </section>

      {unlocks.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-signal-orange/30 bg-signal-orange/[0.04] p-10 text-center sm:p-14">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-orange/10 text-xl text-signal-orange">↗</div>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-charcoal">Your purchased leads will live here.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate">Review the marketplace teaser first. When you unlock an opportunity, its full contact and evidence brief becomes available in this workspace.</p>
          <Link href="/opportunities" className="mt-6 inline-flex rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white">Open marketplace →</Link>
        </section>
      ) : (
        <div className="space-y-8">
          {purchasedPlanning.length > 0 && <section><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-orange">Business opportunities</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-charcoal">Ready to work.</h2></div><span className="text-xs text-slate">{purchasedPlanning.length}</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{purchasedPlanning.map((item) => <OpportunityRow key={item.leadMatchId} item={item} unlocked />)}</div></section>}
          {purchasedMarketSignals.length > 0 && <section><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-orange">Public and commercial signals</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-charcoal">Purchased signal briefs.</h2></div><span className="text-xs text-slate">{purchasedMarketSignals.length}</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{purchasedMarketSignals.map((item) => <MarketSignalRow key={item.market_signal_trade_match_id} item={item} unlocked />)}</div></section>}
          {purchasedPlanning.length + purchasedMarketSignals.length < unlocks.length && <section className="rounded-2xl border border-warning/20 bg-warning/[0.04] p-4 text-sm leading-6 text-slate">Some purchased records are still being assembled into the feed. Your unlock history is retained while the underlying brief is refreshed.</section>}
        </div>
      )}

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">Optional CRM handoff</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate">Keep TradeSignal as the source of truth, then push a purchased lead to your CRM when you are ready. Connector setup can be added later without changing the marketplace workflow.</p></div><Link href="/crm" className="shrink-0 text-sm font-semibold text-signal-orange">View handoff options →</Link></div>
      </section>
    </div>
  );
}

async function getMarketSignalForLeadUnlocks(unlocks: LeadUnlockRow[]): Promise<OwnedMarketSignal[]> {
  const ids = unlocks.map((unlock) => unlock.market_signal_trade_match_id).filter((value): value is string => Boolean(value));
  const details = await Promise.all(ids.map((id) => getMarketSignalForLeadUnlock(id)));
  return details.filter((detail): detail is NonNullable<typeof detail> => Boolean(detail)).map((detail) => ({
    market_signal_trade_match_id: detail.market_signal_trade_match_id,
    signal_type: detail.signal_type,
    title: detail.title,
    postcode_district: detail.postcode_district,
    location_label: detail.location_text ?? detail.postcode_district ?? "United Kingdom",
    location_scope: "exact",
    trade_name: detail.trade_name,
    trade_slug: detail.trade_slug,
    procurement_stage: detail.procurement_stage,
    buyer_name: detail.buyer_name,
    estimated_trade_value_low: detail.estimated_trade_value_low,
    estimated_trade_value_high: detail.estimated_trade_value_high,
    deadline_at: detail.deadline_at,
    published_at: detail.published_at,
    fit_score: detail.fit_score,
    opportunity_bucket: detail.opportunity_bucket,
    recommended_action: detail.recommended_action,
    source_url: detail.source_url,
    current_action: detail.current_action,
  }));
}

function buildCategoryUsage(unlocks: LeadUnlockRow[]) {
  const usage = new Map<string, number>();
  for (const unlock of unlocks) {
    const key = unlock.vertical_key ?? "uncategorised";
    usage.set(key, (usage.get(key) ?? 0) + 1);
  }
  return [...usage.entries()].map(([key, count]) => ({ key, count, label: labelCategory(key) })).sort((a, b) => b.count - a.count);
}

function labelCategory(value: string) {
  const labels: Record<string, string> = {
    epos: "EPOS and payments",
    accountancy: "Accountancy",
    office_fit_out: "Office fit-out",
    internet_services: "Internet services",
    broadband: "Broadband",
    uncategorised: "Category pending",
  };
  return labels[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
