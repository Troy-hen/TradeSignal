"use client";

import Link from "next/link";
import { LeadUnlockButton } from "@/components/marketplace/lead-unlock-button";
import { LEAD_UNLOCK_PRICE_GBP } from "@/lib/coverage/pricing";

export type MarketplaceCardData = {
  opportunityId?: string;
  marketSignalId?: string;
  title: string;
  eyebrow: string;
  geography: string;
  score: number | null;
  bucket: string | null;
  status: string | null;
  valueLow: number | null;
  valueHigh: number | null;
  summary: string | null;
  recommendedAction?: string | null;
  buyingWindow?: string | null;
  likelyNeeds?: string[];
  signalCount?: number | null;
  currentAction?: string | null;
  sourceLabel?: string;
  previewOnly?: boolean;
  unlocked?: boolean;
};

export function MarketplaceCard({ item }: { item: MarketplaceCardData }) {
  const href = item.marketSignalId
    ? `/opportunities/trade/${encodeURIComponent(item.marketSignalId)}`
    : item.opportunityId
      ? `/opportunities/${encodeURIComponent(item.opportunityId)}`
      : "/signup";
  const locked = !item.unlocked && !item.previewOnly;
  const score = item.score === null || item.score === undefined ? "—" : `${Math.round(item.score)}/100`;
  const bucket = labelForBucket(item.bucket);
  const needs = item.likelyNeeds?.length ? item.likelyNeeds : ["Evidence-backed need", "Buying-window context", "Decision-maker detail"];

  return (
    <article className="group flex min-h-[590px] min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-light-grey bg-white shadow-[0_14px_45px_rgba(31,41,55,0.055)] transition duration-200 hover:-translate-y-1 hover:border-signal-orange/35 hover:shadow-[0_22px_56px_rgba(31,41,55,0.1)]">
      <div className="border-b border-light-grey bg-[linear-gradient(135deg,rgba(255,106,0,0.08),rgba(255,255,255,0))] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-signal-orange">{item.eyebrow}</p>
            <p className="mt-2 truncate text-xs font-medium text-slate">{item.geography} · {item.sourceLabel ?? "Unified intelligence"}</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-charcoal px-3 py-2 text-right text-white">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/55">Fit</p>
            <p className="mt-0.5 text-lg font-bold leading-none">{score}</p>
          </div>
        </div>
        <h3 className="mt-5 line-clamp-3 min-h-[5.25rem] text-xl font-bold leading-7 tracking-tight text-charcoal">{item.title}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${item.bucket === "hot" ? "bg-signal-orange text-white" : "bg-signal-orange/10 text-signal-orange"}`}>{bucket}</span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate ring-1 ring-inset ring-light-grey">{item.status ? humanize(item.status) : "Evidence available"}</span>
          {item.currentAction && <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-success">{humanize(item.currentAction)}</span>}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="rounded-2xl border border-signal-orange/15 bg-signal-orange/[0.045] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">Why now</p>
          <p className="mt-2 line-clamp-4 text-sm leading-6 text-charcoal">{item.summary ?? "The intelligence engine has identified a recent buying-window signal in your coverage."}</p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate">Likely to need</p>
            {item.signalCount !== null && item.signalCount !== undefined && <span className="text-[11px] font-medium text-slate">{item.signalCount} signal{item.signalCount === 1 ? "" : "s"}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {needs.slice(0, 4).map((need) => <span key={need} className="rounded-full bg-soft-surface px-2.5 py-1 text-[11px] font-medium text-slate">{need}</span>)}
          </div>
        </div>

        {locked ? (
          <div className="mt-4 grid gap-3" aria-label="Details available after unlock">
            <LockedLine label="Business profile" />
            <LockedLine label="Decision maker and verified contact" />
            <LockedLine label="Evidence timeline and source links" />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 rounded-2xl border border-success/15 bg-success/[0.04] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-success"><span className="h-2 w-2 rounded-full bg-success" />Full opportunity unlocked</div>
            <p className="text-xs leading-5 text-slate">Company details, contacts, evidence and CRM actions are ready in the full brief.</p>
          </div>
        )}

        <div className="mt-auto pt-5">
          <div className="mb-4 flex items-end justify-between gap-3 border-t border-light-grey pt-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">Indicative value</p><p className="mt-1 text-base font-bold text-charcoal">{formatGbpRange(item.valueLow, item.valueHigh)}</p></div>
            <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">Buying window</p><p className="mt-1 max-w-[120px] text-xs font-semibold text-charcoal">{item.buyingWindow ? humanize(item.buyingWindow) : "Current signal"}</p></div>
          </div>
          {item.previewOnly ? <LeadUnlockButton previewOnly /> : item.unlocked ? <Link href={href} className="inline-flex w-full items-center justify-center rounded-xl bg-charcoal px-4 py-3 text-sm font-semibold text-white transition hover:bg-charcoal/90">Open full opportunity <span className="ml-2">→</span></Link> : <LeadUnlockButton opportunityId={item.opportunityId} marketSignalId={item.marketSignalId} />}
          {!item.previewOnly && !item.unlocked && <p className="mt-2 text-center text-[10px] leading-4 text-slate">One-time unlock · {LEAD_UNLOCK_PRICE_GBP} · no lead bundles</p>}
        </div>
      </div>
    </article>
  );
}

function LockedLine({ label }: { label: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-light-grey bg-soft-surface px-3 py-3"><span className="h-2.5 w-16 rounded-full bg-slate/20 blur-[3px]" /><span className="min-w-0 text-xs font-semibold text-slate/60">{label}</span><span className="ml-auto h-2 w-10 rounded-full bg-slate/20 blur-[3px]" /></div>;
}

function labelForBucket(value: string | null): string {
  if (!value) return "Signal";
  if (value === "strong") return "Warm";
  if (value === "possible" || value === "low") return "Early";
  return humanize(value);
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatGbpRange(low: number | null, high: number | null): string {
  const format = (value: number | null) => value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
  if (low === null || low === undefined) return format(high);
  if (high === null || high === undefined) return format(low);
  return `${format(low)}–${format(high)}`;
}
