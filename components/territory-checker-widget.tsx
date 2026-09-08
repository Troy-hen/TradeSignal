"use client";

import { useState } from "react";
import Link from "next/link";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";

interface TradeOption {
  slug: string;
  name: string;
}

interface CheckerResult {
  applications_last_30d: number;
  high_priority_count: number;
  estimated_construction_activity_gbp: number;
  estimated_trade_value_gbp: number;
  territory_status: string;
  monthly_price_pence: number;
}

const FALLBACK_TRADE: TradeOption = {
  slug: "general-builder",
  name: "General Builder",
};

function formatGbp(value: number): string {
  if (value >= 1000) return "£" + Math.round(value / 1000) + "k";
  return "£" + Math.round(value);
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}


export function TerritoryCheckerWidget({
  trades,
  compact = false,
}: {
  trades: TradeOption[];
  compact?: boolean;
}) {
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
    const cleaned = district.trim().toUpperCase();
    if (!cleaned || !tradeSlug) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestUrl =
        "/api/territory-availability?postcode=" +
        encodeURIComponent(cleaned) +
        "&trade=" +
        encodeURIComponent(tradeSlug);
      const res = await fetch(requestUrl);
      const body = await res.json();

      if (!res.ok) {
        setError(
          res.status === 429
            ? "Too many searches — please wait a moment and try again."
            : body.error === "unknown_trade"
              ? "We couldn't recognise that trade."
              : "Something went wrong. Please try again.",
        );
        return;
      }

      setResult(body);
      setCheckedDistrict(cleaned);
      setCheckedTradeName(options.find((t) => t.slug === tradeSlug)?.name ?? tradeSlug);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const priceGbp = result ? Math.round(result.monthly_price_pence / 100) : 0;
  const isAvailable = result?.territory_status === "available";

  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-light-grey bg-white p-4 shadow-[0_18px_50px_rgba(31,41,55,0.12)] sm:p-5"
          : "rounded-3xl border border-light-grey bg-white p-5 shadow-[0_18px_50px_rgba(31,41,55,0.08)] sm:p-7"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            compact
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-orange/10 text-signal-orange"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-signal-orange/10 text-signal-orange"
          }
        >
          <MapPinIcon />
        </div>
        <div>
          <p className="font-semibold text-charcoal">Check your area</p>
          <p className="mt-1 text-sm leading-6 text-slate">
            {compact
              ? "Preview recent planning activity, estimated value and territory availability."
              : "See whether your trade already has an exclusive territory in your postcode district."}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className={
          compact
            ? "mt-4 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            : "mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        }
      >
        <label className="block">
          <span className="sr-only">Postcode district</span>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="e.g. NR15"
            aria-label="Postcode district"
            autoComplete="postal-code"
            required
            maxLength={7}
            className="w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-slate/70 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
          />
        </label>

        <label className="block">
          <span className="sr-only">Trade</span>
          <select
            value={tradeSlug}
            onChange={(e) => setTradeSlug(e.target.value)}
            aria-label="Trade"
            className="w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
          >
            {options.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Checking…" : compact ? "Check My Area" : "Check availability"}
        </button>
      </form>

      <p className="mt-3 text-xs text-slate">
        {compact ? "No account needed to preview the local signal." : "Try a district such as NR15, IP22 or SW11."}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {result && (
        <div role="status" className="mt-6 border-t border-light-grey pt-6 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
                {checkedDistrict} · {checkedTradeName}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-charcoal">
                {isAvailable ? "Your territory is available" : "This territory is already claimed"}
              </h3>
            </div>
            <span
              className={
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold " +
                (isAvailable ? "bg-success/10 text-success" : "bg-slate/10 text-slate")
              }
            >
              <span className={"h-2 w-2 rounded-full " + (isAvailable ? "bg-success" : "bg-slate")} />
              {isAvailable ? "Available" : "Claimed"}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Projects · 30 days" value={String(result.applications_last_30d)} />
            <Stat label="High priority" value={String(result.high_priority_count)} />
            <Stat label="Construction activity" value={formatGbp(result.estimated_construction_activity_gbp)} />
            <Stat
              label={checkedTradeName + " value"}
              value={formatGbp(result.estimated_trade_value_gbp)}
            />
          </div>

          <div className="mt-5">
            <LockedOpportunityPreview
              compact
              title="Opportunity details locked"
              body="Preview the local signal for free. Claim the territory to reveal specific projects, addresses, AI interpretation and contact timing."
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft-surface p-4">
            <div>
              <p className="font-semibold text-charcoal">
                {isAvailable ? "Reserve your local patch" : "Browse other available areas"}
              </p>
              {isAvailable && (
                <p className="mt-1 text-sm text-slate">
                  From £{priceGbp}/month, exclusive to your business.
                </p>
              )}
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
            >
              {isAvailable ? "Claim this territory" : "Sign up free"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-light-grey bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-charcoal">{value}</p>
    </div>
  );
}
