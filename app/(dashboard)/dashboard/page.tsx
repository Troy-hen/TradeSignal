import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { getOwnedMarketSignals } from "@/lib/data/trade-intelligence";
import { listPaidLeadUnlocks } from "@/lib/data/lead-unlocks";
import { OpportunityRow } from "@/components/opportunity-row";
import { MarketSignalRow } from "@/components/market-signal-row";

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
  const allCount = opportunities.length + marketSignals.length;
  const openCount = [...opportunities.map((item) => item.currentAction), ...marketSignals.map((item) => item.current_action)].filter((value) => !["won", "lost"].includes(value ?? "")).length;
  const hotCount = opportunities.filter((item) => item.bucket === "hot").length + marketSignals.filter((item) => item.opportunity_bucket === "hot").length;
  const savedCount = opportunities.filter((item) => ["saved", "viewed"].includes(item.currentAction ?? "")).length + marketSignals.filter((item) => ["saved", "viewed"].includes(item.current_action)).length;
  const newItems = opportunities.filter((item) => item.currentAction === null).slice(0, 3);
  const newSignals = marketSignals.filter((item) => item.current_action === "new").slice(0, 3);

  return (
    <div className="min-w-0 space-y-8">
      <section className="grid min-w-0 gap-8 overflow-hidden rounded-[2rem] bg-charcoal p-6 text-white shadow-xl shadow-charcoal/10 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-center">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Marketplace home</p><h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">Good morning, {company.trading_name}.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">Your profile and coverage are active. Start with the strongest buying windows, then unlock the leads that deserve a response.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/opportunities" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Open marketplace <span className="ml-2">→</span></Link><Link href="/territories" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/85 transition hover:border-white/35 hover:bg-white/5">Open map</Link></div></div>
        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.07] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Your queue</p><div className="mt-4 grid grid-cols-2 gap-3"><DarkMetric label="Open" value={String(openCount)} /><DarkMetric label="Hot" value={String(hotCount)} /><DarkMetric label="Purchased" value={String(paidUnlocks.length)} /><DarkMetric label="Saved" value={String(savedCount)} /></div><Link href="/opportunities" className="mt-5 inline-flex text-sm font-semibold text-signal-orange hover:text-white">Work the marketplace →</Link></div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4"><Kpi label="Open opportunities" value={String(openCount)} detail="Ready to qualify" tone="orange" /><Kpi label="Hot opportunities" value={String(hotCount)} detail="Highest current fit" tone="green" /><Kpi label="Purchased leads" value={String(paidUnlocks.length)} detail="Permanent access" tone="blue" /><Kpi label="Total visible" value={String(allCount)} detail="Across all enabled sources" tone="charcoal" /></section>

      <section className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Marketplace feed</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Start with what is new.</h2><p className="mt-2 text-sm leading-6 text-slate">Tall cards keep the decision simple: why now, likely need, then unlock if the fit is clear.</p></div><Link href="/opportunities" className="text-sm font-semibold text-signal-orange">View all →</Link></div>{newItems.length === 0 && newSignals.length === 0 ? <div className="mt-5 rounded-3xl border border-dashed border-light-grey bg-white p-8 text-center text-sm leading-6 text-slate">No new signals are waiting. Check the marketplace filters or review saved leads.</div> : <div className="mt-5 grid gap-5 md:grid-cols-2">{newItems.slice(0, 2).map((item) => <OpportunityRow key={item.leadMatchId} item={item} unlocked={paidOpportunityIds.has(item.opportunityId)} />)}{newSignals.slice(0, 2).map((item) => <MarketSignalRow key={item.market_signal_trade_match_id} item={item} unlocked={paidMarketSignalIds.has(item.market_signal_trade_match_id)} />)}</div>}</div><aside className="min-w-0 rounded-3xl bg-white p-6 shadow-[0_14px_45px_rgba(31,41,55,0.055)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Next best move</p><h2 className="mt-3 text-2xl font-bold tracking-tight text-charcoal">Qualify one strong signal.</h2><p className="mt-3 text-sm leading-6 text-slate">Open the marketplace, choose the opportunity with the clearest buying window and unlock the full brief only when it earns the £20.</p><div className="mt-6 space-y-3 border-t border-light-grey pt-5 text-sm"><LightRow label="Hot now" value={String(hotCount)} /><LightRow label="Saved" value={String(savedCount)} /><LightRow label="Purchased leads" value={String(paidUnlocks.length)} /></div><Link href="/alerts" className="mt-6 inline-flex text-sm font-semibold text-signal-orange">Review alerts →</Link></aside></section>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-charcoal/40 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-white/45">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>; }
function LightRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><span className="text-slate">{label}</span><span className="font-semibold text-charcoal">{value}</span></div>; }
function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "orange" | "green" | "blue" | "charcoal" }) { const styles = { orange: "border-signal-orange/25 bg-signal-orange/[0.06]", green: "border-success/15 bg-success/[0.035]", blue: "border-slate/15 bg-slate/[0.035]", charcoal: "border-charcoal/10 bg-charcoal/[0.025]" }[tone]; return <div className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${styles}`}><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate sm:text-xs">{label}</p><p className="mt-4 break-words text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">{value}</p><p className="mt-1 text-xs text-slate">{detail}</p></div>; }
function FreeState({ companyName }: { companyName: string }) { return <div className="space-y-8"><section className="grid gap-8 overflow-hidden rounded-[2rem] bg-charcoal p-7 text-white shadow-xl shadow-charcoal/10 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Welcome to the marketplace</p><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Build your opportunity profile.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{companyName}, tell us what you sell, who you sell to and where you operate. One intelligence engine will then surface the opportunities most relevant to you.</p><Link href="/coverage" className="mt-7 inline-flex items-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Set up coverage <span className="ml-2">→</span></Link></div><div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Your setup</p><div className="mt-5 space-y-4"><SetupStep number="01" title="Describe your business" body="Use free text. AI turns it into structured relevance signals." /><SetupStep number="02" title="Choose your coverage" body="Use a county, towns or cities, a radius or the whole UK." /><SetupStep number="03" title="Work the marketplace" body="Review teasers, unlock useful leads and record the outcome." /></div></div></section></div>; }
function SetupStep({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-signal-orange shadow-sm">{number}</span><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/55">{body}</p></div></div>; }
