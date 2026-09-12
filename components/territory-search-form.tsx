"use client";

import Link from "next/link";
import { useState } from "react";
import { normalisePostcodeDistrict } from "@/lib/postcode";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";
import { formatGbp } from "@/components/opportunity-badge";
import { trackProductEvent } from "@/lib/analytics/client";

type TerritoryPreviewResult = {
  applications_last_30d: number;
  high_priority_count: number;
  estimated_construction_activity_gbp: number;
  estimated_trade_value_gbp: number;
  territory_status: string;
  monthly_price_pence: number;
  normalized_profile?: { label: string; keywords: string[]; source: "ai" | "fallback" } | null;
  teaser?: { project_type: string | null; planning_status: string | null; estimated_trade_value_low: number | null; estimated_trade_value_high: number | null } | null;
};

export function TerritorySearchForm({ defaultDistrict }: { trades?: unknown[]; defaultDistrict?: string; defaultTradeSlug?: string }) {
  const [district, setDistrict] = useState(defaultDistrict ?? "");
  const [whatDoYouSell, setWhatDoYouSell] = useState("");
  const [result, setResult] = useState<TerritoryPreviewResult | null>(null);
  const [checkedDistrict, setCheckedDistrict] = useState("");
  const [checkedProfile, setCheckedProfile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = normalisePostcodeDistrict(district);
    if (!cleaned || !whatDoYouSell.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/territory-availability?postcode=" + encodeURIComponent(cleaned) + "&profile=" + encodeURIComponent(whatDoYouSell.trim()));
      const body = await response.json();
      if (!response.ok) {
        setError(response.status === 429 ? "Too many searches — please wait a moment and try again." : body.error === "unknown_postcode_district" ? "We do not have live planning data for that starting location yet." : "We could not check that profile and location. Please try again.");
        return;
      }
      const preview = body as TerritoryPreviewResult;
      setResult(preview);
      setCheckedDistrict(cleaned);
      setCheckedProfile(preview.normalized_profile?.label ?? whatDoYouSell.trim());
      trackProductEvent("territory_previewed", { source: "coverage_explorer_search", metadata: { postcode_district: cleaned, profile: whatDoYouSell.trim(), territory_status: preview.territory_status, applications_30d: Number(preview.applications_last_30d ?? 0), estimated_trade_value_gbp: Number(preview.estimated_trade_value_gbp ?? 0) } });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return <div className="space-y-4"><form onSubmit={handleSubmit} className="rounded-3xl border border-signal-orange/15 bg-signal-orange/[0.035] p-5 shadow-[0_18px_50px_rgba(31,41,55,0.06)] sm:p-7"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-orange text-white shadow-sm shadow-signal-orange/20"><MapPinIcon /></span><div><p className="font-semibold text-charcoal">Explore the marketplace from a starting point</p><p className="mt-1 text-sm leading-6 text-slate">Write what you sell in plain English and add a postcode district. AI normalises your profile before the preview is matched.</p></div></div><div className="mt-6 grid gap-4"><label className="block min-w-0"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">What do you sell?</span><input value={whatDoYouSell} onChange={(event) => setWhatDoYouSell(event.target.value)} placeholder="e.g. commercial CCTV and access control" required maxLength={500} className="w-full min-w-0 rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label><label className="block min-w-0"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Where do you sell?</span><input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="e.g. NR15" autoComplete="postal-code" required maxLength={8} className="w-full min-w-0 rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label></div><button type="submit" disabled={isLoading} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? "Normalising…" : "Preview this signal"}<span className="ml-2">→</span></button><p className="mt-3 text-center text-xs text-slate">Try NR15, IP22 or SW11.</p></form>{error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}{result && <section role="status" className="overflow-hidden rounded-3xl border border-signal-orange/20 bg-white shadow-[0_18px_50px_rgba(255,106,0,0.08)]"><div className="bg-signal-orange/[0.07] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-orange">Normalized profile · {checkedDistrict}</p><h3 className="mt-2 text-xl font-bold tracking-tight text-charcoal">{checkedProfile}</h3><p className="mt-1 text-xs text-slate">{result.normalized_profile?.source === "ai" ? "AI-normalised from your description" : "Profile preview normalised from your description"}</p></div><span className="rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">Preview ready</span></div>{result.normalized_profile?.keywords?.length ? <div className="mt-4 flex flex-wrap gap-2">{result.normalized_profile.keywords.slice(0, 5).map((keyword) => <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate">{keyword}</span>)}</div> : null}<dl className="mt-5 grid grid-cols-2 gap-3"><PreviewMetric label="Signals · 30d" value={String(result.applications_last_30d)} /><PreviewMetric label="High priority" value={String(result.high_priority_count)} /><PreviewMetric label="Activity value" value={formatGbp(result.estimated_construction_activity_gbp)} /><PreviewMetric label="Profile-fit value" value={formatGbp(result.estimated_trade_value_gbp)} /></dl></div><div className="p-4 sm:p-5"><LockedOpportunityPreview compact title="Review the opportunity shape" body="The teaser shows enough to decide whether it is worth your time. Unlock the complete opportunity for £20 when the fit is clear." teaser={result.teaser ? { projectType: result.teaser.project_type, status: result.teaser.planning_status, estimatedTradeValueLow: result.teaser.estimated_trade_value_low, estimatedTradeValueHigh: result.teaser.estimated_trade_value_high } : null} /><div className="mt-4 flex flex-col gap-3 rounded-2xl bg-soft-surface p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-charcoal">Choose your coverage next</p><p className="mt-1 text-xs leading-5 text-slate">Local, Regional or Nationwide. All relevant sources stay included.</p></div><Link href="/coverage" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Set up coverage</Link></div></div></section>}</div>;
}

function PreviewMetric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-signal-orange/10 bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt><dd className="mt-1 break-words text-base font-bold tracking-tight text-charcoal">{value}</dd></div>; }
function MapPinIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z" /><circle cx="12" cy="10" r="2.25" /></svg>; }
