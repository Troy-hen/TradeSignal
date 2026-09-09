"use client";

import Link from "next/link";
import { useState } from "react";
import { normalisePostcodeDistrict } from "@/lib/postcode";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";
import { formatGbp } from "@/components/opportunity-badge";

type TradeOption = { id: string; slug: string; name: string };

type TerritoryPreviewResult = {
  applications_last_30d: number;
  high_priority_count: number;
  estimated_construction_activity_gbp: number;
  estimated_trade_value_gbp: number;
  territory_status: string;
  monthly_price_pence: number;
  teaser?: {
    project_type: string | null;
    planning_status: string | null;
    estimated_trade_value_low: number | null;
    estimated_trade_value_high: number | null;
  } | null;
};

export function TerritorySearchForm({
  trades,
  defaultDistrict,
  defaultTradeSlug,
}: {
  trades: TradeOption[];
  defaultDistrict?: string;
  defaultTradeSlug?: string;
}) {
  const [district, setDistrict] = useState(defaultDistrict ?? "");
  const [tradeSlug, setTradeSlug] = useState(defaultTradeSlug ?? trades[0]?.slug ?? "");
  const [result, setResult] = useState<TerritoryPreviewResult | null>(null);
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
      const response = await fetch(
        "/api/territory-availability?postcode=" + encodeURIComponent(cleaned) + "&trade=" + encodeURIComponent(tradeSlug),
      );
      const body = await response.json();
      if (!response.ok) {
        setError(
          response.status === 429
            ? "Too many searches — please wait a moment and try again."
            : body.error === "unknown_postcode_district"
              ? "We do not have live planning data for that postcode district yet."
              : body.error === "unknown_trade"
                ? "We could not recognise that trade."
                : "We could not check that territory. Please try again.",
        );
        return;
      }

      setResult(body as TerritoryPreviewResult);
      setCheckedDistrict(cleaned);
      setCheckedTradeName(trades.find((trade) => trade.slug === tradeSlug)?.name ?? tradeSlug);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="rounded-3xl border border-signal-orange/15 bg-signal-orange/[0.035] p-5 shadow-[0_18px_50px_rgba(31,41,55,0.06)] sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-orange text-white shadow-sm shadow-signal-orange/20">
            <MapPinIcon />
          </span>
          <div>
            <p className="font-semibold text-charcoal">Find your local signal</p>
            <p className="mt-1 text-sm leading-6 text-slate">Search by postcode district and trade to preview what is there before opening the full territory page.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="block min-w-0">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Postcode district</span>
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. NR15"
              autoComplete="postal-code"
              required
              maxLength={8}
              className="w-full min-w-0 rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
            />
          </label>

          <label className="block min-w-0">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Your trade</span>
            <select
              value={tradeSlug}
              onChange={(e) => setTradeSlug(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
            >
              {trades.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || trades.length === 0}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Checking…" : "Preview this territory"}
          {!isLoading && <span className="ml-2">→</span>}
        </button>
        {trades.length === 0 && (
          <p role="status" className="mt-3 text-center text-xs text-danger">
            Trade options are temporarily unavailable. Please refresh and try again.
          </p>
        )}
        <p className="mt-3 text-center text-xs text-slate">Try NR15, IP22 or SW11.</p>
      </form>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {result && (
        <section role="status" className="overflow-hidden rounded-3xl border border-signal-orange/20 bg-white shadow-[0_18px_50px_rgba(255,106,0,0.08)]">
          <div className="bg-signal-orange/[0.07] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-orange">Territory preview</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-charcoal">
                  {checkedDistrict} · {checkedTradeName}
                </h3>
              </div>
              <span className={"rounded-full px-3 py-1.5 text-xs font-semibold " + (result.territory_status === "available" ? "bg-success/10 text-success" : "bg-slate/10 text-slate")}>
                {result.territory_status === "available" ? "Available" : "Claimed"}
              </span>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3">
              <PreviewMetric label="Projects · 30d" value={String(result.applications_last_30d)} />
              <PreviewMetric label="High priority" value={String(result.high_priority_count)} />
              <PreviewMetric label="Construction activity" value={formatGbp(result.estimated_construction_activity_gbp)} />
              <PreviewMetric label="Est. trade value" value={formatGbp(result.estimated_trade_value_gbp)} />
            </dl>
          </div>

          <div className="p-4 sm:p-5">
            <LockedOpportunityPreview
              compact
              title="A real project teaser from this district"
              body="The project type, status and indicative trade value are visible. Claim the territory to unlock the address, planning reference, full brief and contact timing."
              teaser={
                result.teaser
                  ? {
                      projectType: result.teaser.project_type,
                      status: result.teaser.planning_status,
                      estimatedTradeValueLow: result.teaser.estimated_trade_value_low,
                      estimatedTradeValueHigh: result.teaser.estimated_trade_value_high,
                    }
                  : null
              }
            />

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-soft-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {result.territory_status === "available" ? "Want the full local feed?" : "See the territory status and options"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate">Specific opportunity details stay locked until the territory belongs to your business.</p>
              </div>
              <Link
                href={"/territories/" + encodeURIComponent(checkedDistrict) + "/" + encodeURIComponent(tradeSlug)}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
              >
                {result.territory_status === "available" ? "View & claim" : "View territory"}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-signal-orange/10 bg-white p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt>
      <dd className="mt-1 break-words text-base font-bold tracking-tight text-charcoal">{value}</dd>
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}
