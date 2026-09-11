import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { getOwnedMarketSignals } from "@/lib/data/trade-intelligence";
import { getNewWorkspaceQuoteRequests } from "@/lib/data/quote-requests";
import { formatGbp, formatGbpRange } from "@/components/opportunity-badge";
import { OpportunityBadge } from "@/components/opportunity-badge";
import { OpportunityRow } from "@/components/opportunity-row";
import { MarketSignalRow } from "@/components/market-signal-row";
import { DailyTradeBrief } from "@/components/daily-trade-brief";

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const { data: activeClaims } = await supabase.from("territory_claims").select("id").eq("company_id", company.id).eq("status", "active").limit(1);

  if (!activeClaims || activeClaims.length === 0) return <FreeState companyName={company.trading_name} />;

  const [opportunities, marketSignals, inboundRequests] = await Promise.all([
    getCompanyOpportunities(company.id),
    getOwnedMarketSignals(100),
    getNewWorkspaceQuoteRequests(company.id, 20),
  ]);

  const newPlanning = opportunities.filter((item) => item.currentAction === null);
  const newMarket = marketSignals.filter((item) => item.current_action === "new");
  const hotCount = opportunities.filter((item) => item.bucket === "hot").length + marketSignals.filter((item) => item.opportunity_bucket === "hot").length;
  const pipelineValue = opportunities.filter((item) => !["won", "lost"].includes(item.currentAction ?? "")).reduce((sum, item) => sum + (item.valueHigh ?? 0), 0)
    + marketSignals.filter((item) => !["won", "lost"].includes(item.current_action)).reduce((sum, item) => sum + Number(item.estimated_trade_value_high ?? item.estimated_trade_value_low ?? 0), 0);
  const recentDecisionCount = opportunities.filter((item) => item.planningStatus === "approved" && item.decisionDate !== null && item.decisionDate >= dateDaysAgo(7)).length;
  const marketPulse = [
    { label: "Projects & fit-outs", detail: "Planning matches", value: opportunities.length, tone: "orange" },
    { label: "Public contracts", detail: "Tenders, pipeline and awards", value: marketSignals.filter((item) => ["tender", "public_pipeline", "contract_award"].includes(item.signal_type)).length, tone: "blue" },
    { label: "Commercial development", detail: "Commercial build signals", value: marketSignals.filter((item) => item.signal_type === "commercial_development").length + opportunities.filter((item) => item.isCommercial === true).length, tone: "green" },
  ] as const;
  const workflowCounts = {
    new: newPlanning.length + newMarket.length,
    saved: opportunities.filter((item) => ["saved", "viewed"].includes(item.currentAction ?? "")).length + marketSignals.filter((item) => ["saved", "viewed"].includes(item.current_action)).length,
    inProgress: opportunities.filter((item) => ["contacted", "quoted"].includes(item.currentAction ?? "")).length + marketSignals.filter((item) => ["contacted", "quoted"].includes(item.current_action)).length,
    won: opportunities.filter((item) => item.currentAction === "won").length + marketSignals.filter((item) => item.current_action === "won").length,
  };

  return (
    <div className="min-w-0 space-y-8">
      <section className="grid min-w-0 gap-6 overflow-hidden rounded-[2rem] bg-charcoal p-6 text-white shadow-xl shadow-charcoal/10 sm:p-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Marketplace overview</p>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">Find the next commercial opportunity before it becomes obvious.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">Your owned markets are now a working opportunity surface: signals arrive with a reason to care, a fit score and a next move.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/opportunities" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Open marketplace <span className="ml-2">→</span></Link>
            <Link href="/markets" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/85 transition hover:border-white/35 hover:bg-white/5">Browse markets</Link>
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.07] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Your live market</p><p className="mt-1 text-lg font-semibold text-white">Fresh signals worth reviewing</p></div><span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-success">Owned territory</span></div>
          <div className="mt-5 space-y-3">
            {opportunities.slice(0, 2).map((item) => <div key={item.leadMatchId} className="min-w-0 rounded-2xl border border-white/10 bg-charcoal/40 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">{item.tradeName} · {item.district}</p><p className="mt-1 truncate text-sm font-semibold text-white">{item.projectType ?? "Planning opportunity"}</p></div><OpportunityBadge bucket={item.bucket} score={item.score} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55"><span>{item.isCommercial ? "Commercial build" : "Planning signal"}</span><span className="font-semibold text-white">{formatGbpRange(item.valueLow, item.valueHigh)}</span></div></div>)}
            {marketSignals.slice(0, 1).map((item) => <div key={item.market_signal_trade_match_id} className="min-w-0 rounded-2xl border border-signal-orange/25 bg-signal-orange/10 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-signal-orange">{item.trade_name} · {item.location_label}</p><p className="mt-1 truncate text-sm font-semibold text-white">{item.title}</p></div><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-signal-orange">{item.opportunity_bucket ?? "Signal"}</span></div><div className="mt-3 flex items-center justify-between gap-2 text-xs text-white/55"><span>{item.signal_type.replace(/_/g, " ")}</span><span className="font-semibold text-white">{formatGbpRange(item.estimated_trade_value_low, item.estimated_trade_value_high)}</span></div></div>)}
            {opportunities.length === 0 && marketSignals.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">Your owned markets are ready. New signals will appear here as they are qualified.</p>}
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="New signals" value={String(workflowCounts.new)} detail="Waiting for your decision" tone="orange" />
        <Kpi label="High priority" value={String(hotCount)} detail="Strongest current fit" tone="green" />
        <Kpi label="Quote requests" value={String(inboundRequests.length)} detail={inboundRequests.length ? "Inbound prospects waiting" : `${recentDecisionCount} approvals this week`} tone="blue" />
        <Kpi label="Pipeline value" value={formatGbp(pipelineValue)} detail="Indicative opportunity value" tone="charcoal" />
      </dl>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Market pulse</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Where your current signal is coming from.</h2></div><Link href="/markets" className="text-sm font-semibold text-signal-orange">View market directory →</Link></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">{marketPulse.map((item) => <div key={item.label} className={`rounded-2xl border p-5 ${item.tone === "orange" ? "border-signal-orange/25 bg-signal-orange/[0.055]" : item.tone === "green" ? "border-success/20 bg-success/[0.04]" : "border-slate/15 bg-slate/[0.035]"}`}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-charcoal">{item.label}</p><span className="text-2xl font-bold tracking-tight text-charcoal">{item.value}</span></div><p className="mt-2 text-xs text-slate">{item.detail}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/80"><div className={`h-full rounded-full ${item.tone === "orange" ? "bg-signal-orange" : item.tone === "green" ? "bg-success" : "bg-slate"}`} style={{ width: `${Math.min(100, Math.max(item.value > 0 ? 18 : 4, item.value * 12))}%` }} /></div></div>)}</div>
      </section>

      <DailyTradeBrief />

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-light-grey bg-white">
          <div className="flex flex-col gap-3 border-b border-signal-orange/10 bg-signal-orange/[0.025] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Marketplace feed</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-charcoal">Start with what is new.</h2><p className="mt-1 text-xs text-slate">Review the signal, then decide whether it belongs in your pipeline.</p></div><Link href="/opportunities" className="text-sm font-semibold text-signal-orange hover:text-[#e95f00]">View all →</Link></div>
          {newPlanning.length === 0 && newMarket.length === 0 ? <p className="m-5 rounded-2xl border border-dashed border-light-grey bg-soft-surface p-8 text-center text-sm text-slate sm:m-6">No new signals right now. Your next opportunity may be in another market or arriving in the next refresh.</p> : <div className="space-y-5 p-4 sm:p-5">{newPlanning.slice(0, 4).length > 0 && <div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Projects & fit-outs</p><ul className="space-y-3">{newPlanning.slice(0, 4).map((item) => <li key={item.leadMatchId}><OpportunityRow item={item} /></li>)}</ul></div>}{newMarket.slice(0, 4).length > 0 && <div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Public & commercial</p><ul className="space-y-3">{newMarket.slice(0, 4).map((item) => <li key={item.market_signal_trade_match_id}><MarketSignalRow item={item} /></li>)}</ul></div>}</div>}
        </section>

        <aside className="min-w-0 rounded-3xl bg-charcoal p-6 text-white shadow-xl shadow-charcoal/10"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Next best move</p><h2 className="mt-4 text-2xl font-bold tracking-tight">Keep the loop moving.</h2><p className="mt-4 text-sm leading-6 text-white/65">{inboundRequests.length > 0 ? `You have ${inboundRequests.length} inbound quote ${inboundRequests.length === 1 ? "request" : "requests"}. Respond to those before working cold opportunities.` : "Qualify one strong signal, take the recommended action and record the outcome so the marketplace gets smarter."}</p><div className="mt-7 space-y-3 border-t border-white/10 pt-5 text-sm"><QuickTip label="New" value={String(workflowCounts.new)} /><QuickTip label="Saved" value={String(workflowCounts.saved)} /><QuickTip label="In progress" value={String(workflowCounts.inProgress)} /><QuickTip label="Won" value={String(workflowCounts.won)} /></div><Link href="/crm" className="mt-7 inline-flex items-center text-sm font-semibold text-signal-orange hover:text-white">Open your CRM <span className="ml-2">→</span></Link></aside>
      </div>
    </div>
  );
}

function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "orange" | "green" | "blue" | "charcoal" }) {
  const toneClass = { orange: "border-signal-orange/25 bg-signal-orange/[0.06]", green: "border-success/15 bg-success/[0.035]", blue: "border-slate/15 bg-slate/[0.035]", charcoal: "border-charcoal/10 bg-charcoal/[0.025]" }[tone];
  const dotClass = { orange: "bg-signal-orange", green: "bg-success", blue: "bg-slate", charcoal: "bg-charcoal" }[tone];
  return <div className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${toneClass}`}><div className="flex min-w-0 items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} /><dt className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate sm:text-xs sm:tracking-[0.11em]">{label}</dt></div><dd className="mt-4 break-words text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">{value}</dd><p className="mt-1 text-xs text-slate">{detail}</p></div>;
}

function QuickTip({ label, value }: { label: string; value: string }) { return <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><span className="text-white/50">{label}</span><span className="font-semibold text-white">{value}</span></div>; }

function FreeState({ companyName }: { companyName: string }) {
  return <div className="space-y-8"><section className="grid gap-8 overflow-hidden rounded-[2rem] bg-charcoal p-7 text-white shadow-xl shadow-charcoal/10 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Welcome to the marketplace</p><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Build your first opportunity market.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{companyName}, choose what you sell and where you sell it. MyTradeBox will turn the relevant signals into a focused, actionable feed.</p><Link href="/markets" className="mt-7 inline-flex items-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Browse markets <span className="ml-2">→</span></Link></div><div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Your setup</p><div className="mt-5 space-y-4"><OnboardingStep number="01" title="Choose your market" body="Start with planning, public contracts or a future commercial layer." /><OnboardingStep number="02" title="Own your geography" body="Select the postcode districts where you can actually deliver." /><OnboardingStep number="03" title="Work the signal" body="Review evidence, unlock when ready and record the outcome." /></div></div></section></div>;
}

function OnboardingStep({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-signal-orange shadow-sm">{number}</span><div className="min-w-0"><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/55">{body}</p></div></div>; }
