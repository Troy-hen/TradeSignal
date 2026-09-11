import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { getOwnedMarketSignals } from "@/lib/data/trade-intelligence";
import { listPaidLeadUnlocks } from "@/lib/data/lead-unlocks";
import { OpportunityRow } from "@/components/opportunity-row";
import { MarketSignalRow } from "@/components/market-signal-row";
import { AppPageHeader } from "@/components/app-page-header";

export default async function DashboardPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const [{ data: activeClaims }, { data: activePlans }] = await Promise.all([
    supabase.from("territory_claims").select("id").eq("company_id", company.id).eq("status", "active").limit(1),
    supabase.from("coverage_plans").select("id").eq("company_id", company.id).in("status", ["reserved", "active", "pending_change"]).limit(1),
  ]);

  if ((!activeClaims || activeClaims.length === 0) && (!activePlans || activePlans.length === 0)) return <FreeState companyName={company.trading_name} />;

  const [opportunities, marketSignals, paidUnlocks] = await Promise.all([
    getCompanyOpportunities(company.id, { limit: 200 }),
    getOwnedMarketSignals(100),
    listPaidLeadUnlocks(company.id),
  ]);
  const paidOpportunityIds = new Set(paidUnlocks.map((unlock) => unlock.application_trade_opportunity_id).filter((value): value is string => Boolean(value)));
  const paidMarketSignalIds = new Set(paidUnlocks.map((unlock) => unlock.market_signal_trade_match_id).filter((value): value is string => Boolean(value)));
  const visibleOpportunities = opportunities.filter((item) => !paidOpportunityIds.has(item.opportunityId));
  const visibleMarketSignals = marketSignals.filter((item) => !paidMarketSignalIds.has(item.market_signal_trade_match_id));
  const openCount = [...visibleOpportunities.map((item) => item.currentAction), ...visibleMarketSignals.map((item) => item.current_action)].filter((value) => !["won", "lost"].includes(value ?? "")).length;
  const hotCount = visibleOpportunities.filter((item) => item.bucket === "hot").length + visibleMarketSignals.filter((item) => item.opportunity_bucket === "hot").length;
  const savedCount = visibleOpportunities.filter((item) => ["saved", "viewed"].includes(item.currentAction ?? "")).length + visibleMarketSignals.filter((item) => ["saved", "viewed"].includes(item.current_action)).length;
  const newItems = visibleOpportunities.filter((item) => item.currentAction === null).slice(0, 3);
  const newSignals = visibleMarketSignals.filter((item) => item.current_action === "new").slice(0, 3);

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader
        eyebrow="Dashboard"
        title={`Good morning, ${company.trading_name}.`}
        description="Your profile and coverage are active. Start with the strongest buying windows, then unlock the leads that deserve a response."
        actions={<><Link href="/opportunities" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Open marketplace <span className="ml-2">→</span></Link><Link href="/purchased" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-5 py-3 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Purchased leads</Link><Link href="/territories" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-5 py-3 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Open map</Link></>}
        stats={[{ label: "Open opportunities", value: String(openCount), detail: "Ready to qualify" }, { label: "Hot now", value: String(hotCount), detail: "Highest current fit" }, { label: "Purchased leads", value: String(paidUnlocks.length), detail: "Permanent access" }, { label: "Shortlisted", value: String(savedCount), detail: "Saved to revisit" }]}
      />

      <section className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Marketplace feed</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Start with what is new.</h2><p className="mt-2 text-sm leading-6 text-slate">Tall cards keep the decision simple: why now, likely need, then unlock if the fit is clear.</p></div><Link href="/opportunities" className="text-sm font-semibold text-signal-orange">View all →</Link></div>{newItems.length === 0 && newSignals.length === 0 ? <div className="mt-5 rounded-3xl border border-dashed border-light-grey bg-white p-8 text-center text-sm leading-6 text-slate">No new signals are waiting. Check the marketplace filters or review saved leads.</div> : <div className="mt-5 grid gap-5 md:grid-cols-2">{newItems.slice(0, 2).map((item) => <OpportunityRow key={item.leadMatchId} item={item} unlocked={paidOpportunityIds.has(item.opportunityId)} />)}{newSignals.slice(0, 2).map((item) => <MarketSignalRow key={item.market_signal_trade_match_id} item={item} unlocked={paidMarketSignalIds.has(item.market_signal_trade_match_id)} />)}</div>}</div><aside className="min-w-0 rounded-3xl border border-light-grey bg-white p-6 shadow-[0_14px_45px_rgba(31,41,55,0.045)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Next best move</p><h2 className="mt-3 text-2xl font-bold tracking-tight text-charcoal">Qualify one strong signal.</h2><p className="mt-3 text-sm leading-6 text-slate">Open the marketplace, choose the opportunity with the clearest buying window and unlock the full brief only when it earns the £20.</p><div className="mt-6 space-y-3 border-t border-light-grey pt-5 text-sm"><LightRow label="Hot now" value={String(hotCount)} /><LightRow label="Shortlisted" value={String(savedCount)} /><LightRow label="Purchased leads" value={String(paidUnlocks.length)} /></div><Link href="/opportunities?action=saved" className="mt-6 inline-flex text-sm font-semibold text-signal-orange">Review saved leads →</Link></aside></section>
    </div>
  );
}

function LightRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-slate">{label}</span><span className="font-semibold text-charcoal">{value}</span></div>; }
function FreeState({ companyName }: { companyName: string }) { return <div className="space-y-8"><AppPageHeader eyebrow="Workspace setup" title="Build your opportunity profile." description={`${companyName}, tell us what you sell, who you sell to and where you operate. One intelligence engine will then surface the opportunities most relevant to you.`} actions={<Link href="/coverage" className="inline-flex items-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Set up your plan <span className="ml-2">→</span></Link>} /><section className="grid gap-5 rounded-3xl border border-light-grey bg-white p-6 sm:p-8 md:grid-cols-3"><SetupStep number="01" title="Describe your business" body="Use free text. AI turns it into structured relevance signals." /><SetupStep number="02" title="Choose your reach" body="Use a county, towns or cities, a radius or the whole UK." /><SetupStep number="03" title="Work the marketplace" body="Review teasers, unlock useful leads and record the outcome." /></section></div>; }
function SetupStep({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-signal-orange/10 text-xs font-bold text-signal-orange">{number}</span><div><p className="text-sm font-semibold text-charcoal">{title}</p><p className="mt-1 text-xs leading-5 text-slate">{body}</p></div></div>; }
