"use client";

import { useState } from "react";
import Link from "next/link";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";
import { normalisePostcodeDistrict } from "@/lib/postcode";
import { formatGbp } from "@/components/opportunity-badge";

interface TradeOption { slug: string; name: string; }
interface CheckerResult {
  applications_last_30d: number;
  high_priority_count: number;
  estimated_construction_activity_gbp: number;
  estimated_trade_value_gbp: number;
  territory_status: string;
  monthly_price_pence: number;
  signal_breakdown?: { hot: number; warm: number; early: number } | null;
  market_breakdown?: Array<{ key: string; count: number }> | null;
  teaser?: { project_type: string | null; planning_status: string | null; estimated_trade_value_low: number | null; estimated_trade_value_high: number | null } | null;
}

const FALLBACK_TRADE: TradeOption = { slug: "general-builder", name: "General Builder" };

function formatMonthlyPrice(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pence / 100);
}

function MapPinIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z" /><circle cx="12" cy="10" r="2.25" /></svg>;
}

export function TerritoryCheckerWidget({ trades, compact = false }: { trades: TradeOption[]; compact?: boolean }) {
  const options = trades.length > 0 ? trades : [FALLBACK_TRADE];
  const [district, setDistrict] = useState("");
  const [tradeSlug, setTradeSlug] = useState(options[0]?.slug ?? FALLBACK_TRADE.slug);
  const [result, setResult] = useState<CheckerResult | null>(null);
  const [checkedDistrict, setCheckedDistrict] = useState("");
  const [checkedTradeName, setCheckedTradeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = normalisePostcodeDistrict(district);
    if (!cleaned || !tradeSlug) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const requestUrl = "/api/territory-availability?postcode=" + encodeURIComponent(cleaned) + "&trade=" + encodeURIComponent(tradeSlug);
      const res = await fetch(requestUrl);
      const body = await res.json();
      if (!res.ok) {
        setError(res.status === 429 ? "Too many searches — please wait a moment and try again." : body.error === "unknown_postcode_district" ? "We don't cover that postcode district yet. Try NR15, IP22 or SW11." : body.error === "unknown_trade" ? "We couldn't recognise that supplier category." : "Something went wrong. Please try again.");
        return;
      }
      setResult(body);
      setCheckedDistrict(cleaned);
      setCheckedTradeName(options.find((trade) => trade.slug === tradeSlug)?.name ?? tradeSlug);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const priceLabel = result ? formatMonthlyPrice(result.monthly_price_pence) : "";
  const isAvailable = result?.territory_status === "available";

  return (
    <div className={compact ? "rounded-2xl border border-light-grey bg-white p-4 text-charcoal shadow-[0_18px_50px_rgba(31,41,55,0.12)] sm:p-5" : "rounded-3xl border border-light-grey bg-white p-5 text-charcoal shadow-[0_18px_50px_rgba(31,41,55,0.08)] sm:p-7"}>
      <div className="flex items-start gap-3"><div className={compact ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-orange/10 text-signal-orange" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-signal-orange/10 text-signal-orange"}><MapPinIcon /></div><div><p className="font-semibold text-charcoal">Build your market</p><p className="mt-1 text-sm leading-6 text-slate">{compact ? "Choose what you sell and where you sell it. Preview the local opportunity signal." : "See whether your supplier category already has an exclusive market in this postcode district."}</p></div></div>

      <form onSubmit={handleSubmit} className={compact ? "mt-5 grid gap-3" : "mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"}>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate">What do you sell?</span><select value={tradeSlug} onChange={(e) => setTradeSlug(e.target.value)} aria-label="What do you sell?" className="w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15">{options.map((trade) => <option key={trade.slug} value={trade.slug}>{trade.name}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate">Where do you sell?</span><input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. NR15" aria-label="Where do you sell?" autoComplete="postal-code" required maxLength={8} className="w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-slate/70 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label>
        <button type="submit" disabled={isLoading} className={compact ? "inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60 sm:mt-5" : "inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60 sm:mt-5"}>{isLoading ? "Checking…" : "Preview market"}</button>
      </form>

      <p className="mt-3 text-xs text-slate">{compact ? "No account needed to preview the local signal." : "Try a district such as NR15, IP22 or SW11."}</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}

      {result && <div role="status" className="mt-6 border-t border-light-grey pt-6 text-left"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">{checkedTradeName} · {checkedDistrict}</p><h3 className="mt-2 text-lg font-semibold text-charcoal">{isAvailable ? "Your market is available" : "This market is already claimed"}</h3></div><span className={"inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold " + (isAvailable ? "bg-success/10 text-success" : "bg-slate/10 text-slate")}><span className={"h-2 w-2 rounded-full " + (isAvailable ? "bg-success" : "bg-slate")} />{isAvailable ? "Available" : "Claimed"}</span></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Signals · 30 days" value={String(result.applications_last_30d)} /><Stat label="High priority" value={String(result.high_priority_count)} /><Stat label="Activity value" value={formatGbp(result.estimated_construction_activity_gbp)} /><Stat label={checkedTradeName + " value"} value={formatGbp(result.estimated_trade_value_gbp)} /></div>{result.signal_breakdown && <div className="mt-5 rounded-2xl border border-light-grey bg-soft-surface p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Current scored signal mix</p><span className="text-[11px] text-slate">From the available feed</span></div><div className="mt-3 grid grid-cols-3 gap-2"><SignalStat label="Hot" value={result.signal_breakdown.hot} tone="orange" /><SignalStat label="Warm" value={result.signal_breakdown.warm} tone="blue" /><SignalStat label="Early" value={result.signal_breakdown.early} tone="green" /></div>{result.market_breakdown && result.market_breakdown.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{result.market_breakdown.map((market) => <span key={market.key} className="rounded-full border border-light-grey bg-white px-2.5 py-1 text-[11px] font-medium text-slate">{formatMarket(market.key)} · {market.count}</span>)}</div>}</div>}{!result.signal_breakdown && <p className="mt-5 rounded-2xl border border-dashed border-light-grey p-4 text-xs leading-5 text-slate">The scored signal mix will appear as this market's source feed is populated.</p>}<div className="mt-5"><LockedOpportunityPreview compact title="Preview the opportunity shape" body="See the local signal for free. Claim the market to reveal specific businesses, evidence and contact timing." teaser={result.teaser ? { projectType: result.teaser.project_type, status: result.teaser.planning_status, estimatedTradeValueLow: result.teaser.estimated_trade_value_low, estimatedTradeValueHigh: result.teaser.estimated_trade_value_high } : null} /></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft-surface p-4"><div><p className="font-semibold text-charcoal">{isAvailable ? "Reserve this market" : "Browse other available areas"}</p>{isAvailable && <p className="mt-1 text-sm text-slate">From {priceLabel}/month, exclusive to your business.</p>}</div><Link href={"/territories/" + encodeURIComponent(checkedDistrict) + "/" + encodeURIComponent(tradeSlug)} className="inline-flex items-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">{isAvailable ? "View market & claim" : "View market"}</Link></div></div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-light-grey bg-white p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-1 text-xl font-bold tracking-tight text-charcoal">{value}</p></div>; }
function SignalStat({ label, value, tone }: { label: string; value: number; tone: "orange" | "blue" | "green" }) { const styles = { orange: "text-signal-orange", blue: "text-slate", green: "text-success" }[tone]; return <div className="rounded-xl border border-light-grey bg-white p-3"><p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${styles}`}>{label}</p><p className="mt-1 text-lg font-bold text-charcoal">{value}</p></div>; }
function formatMarket(value: string): string { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
