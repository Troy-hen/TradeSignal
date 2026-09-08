"use client";

import { useState } from "react";
import Link from "next/link";

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

function formatGbp(value: number): string {
  if (value >= 1000) return `£${Math.round(value / 1000)}k`;
  return `£${Math.round(value)}`;
}

export function TerritoryCheckerWidget({ trades }: { trades: TradeOption[] }) {
  const [district, setDistrict] = useState("");
  const [tradeSlug, setTradeSlug] = useState(trades[0]?.slug ?? "");
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
      const res = await fetch(`/api/territory-availability?postcode=${encodeURIComponent(cleaned)}&trade=${encodeURIComponent(tradeSlug)}`);
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
      setCheckedTradeName(trades.find((t) => t.slug === tradeSlug)?.name ?? tradeSlug);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const priceGbp = result ? Math.round(result.monthly_price_pence / 100) : 0;
  const isAvailable = result?.territory_status === "available";

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="Postcode district, e.g. NR15"
          aria-label="Postcode district"
          className="flex-1 rounded-md border border-light-grey px-4 py-3 text-base focus:border-signal-orange focus:outline-none"
        />
        <select
          value={tradeSlug}
          onChange={(e) => setTradeSlug(e.target.value)}
          aria-label="Trade"
          className="rounded-md border border-light-grey px-4 py-3 text-base focus:border-signal-orange focus:outline-none sm:w-56"
        >
          {trades.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-signal-orange px-8 py-3 font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {isLoading ? "Checking…" : "Check my area"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {result && (
        <div className="mt-6 rounded-lg border border-light-grey bg-white p-6 text-left">
          <p className="text-sm text-slate">
            {checkedDistrict} · {checkedTradeName}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Projects (30d)" value={String(result.applications_last_30d)} />
            <Stat label="High priority" value={String(result.high_priority_count)} />
            <Stat label="Est. construction activity" value={formatGbp(result.estimated_construction_activity_gbp)} />
            <Stat label={`Est. ${checkedTradeName.toLowerCase()} value`} value={formatGbp(result.estimated_trade_value_gbp)} />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-soft-surface p-4">
            <div>
              <p className="font-semibold text-charcoal">{isAvailable ? "Available" : "Already claimed"}</p>
              {isAvailable && <p className="text-sm text-slate">£{priceGbp}/month, exclusive to your business</p>}
            </div>
            <Link
              href="/signup"
              className="rounded-md bg-signal-orange px-5 py-2.5 font-semibold text-white transition hover:brightness-95"
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
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 text-xl font-bold text-charcoal">{value}</p>
    </div>
  );
}
