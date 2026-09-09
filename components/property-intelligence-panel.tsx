"use client";

import { useState } from "react";
import type { StoredPropertyIntelligence } from "@/lib/data/property-intelligence";

export function PropertyIntelligencePanel({
  opportunityId,
  configured,
  initialIntelligence,
}: {
  opportunityId: string;
  configured: boolean;
  initialIntelligence: StoredPropertyIntelligence | null;
}) {
  const [intelligence, setIntelligence] = useState(initialIntelligence);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured && !intelligence) return null;

  async function enrich(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/property-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      const payload = (await response.json()) as { intelligence?: StoredPropertyIntelligence; error?: string; message?: string };
      if (!response.ok || !payload.intelligence) throw new Error(payload.message ?? friendlyError(payload.error));
      setIntelligence(payload.intelligence);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Property intelligence could not be refreshed.");
    } finally {
      setLoading(false);
    }
  }

  if (!intelligence) {
    return (
      <section className="mt-6 rounded-3xl border border-light-grey bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Property context</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Add property-level timing intelligence</h2>
            <p className="mt-2 text-sm leading-6 text-slate">
              Match this project address to TwentyCI to surface property value, recent market activity and transaction recency. This enriches timing intelligence; it does not reveal private homeowner contact details.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => enrich(false)}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-orange disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Checking property…" : "Enrich property"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </section>
    );
  }

  const stale = intelligence.expires_at ? Date.parse(intelligence.expires_at) <= Date.now() : false;
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-light-grey bg-white">
      <div className="flex flex-col gap-4 bg-soft-surface p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Property context</p>
            <SignalBadge signal={intelligence.timing_signal} />
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Property activity around this planning opportunity</h2>
          <p className="mt-2 text-sm leading-6 text-slate">
            TwentyCI property intelligence matched at {Math.round(Number(intelligence.match_confidence) * 100)}% confidence. These signals help judge timing and context; they do not identify the homeowner or create permission to email them.
          </p>
        </div>
        {configured && (
          <button
            type="button"
            disabled={loading}
            onClick={() => enrich(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-light-grey bg-white px-3.5 py-2 text-xs font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange disabled:opacity-50"
          >
            {loading ? "Refreshing…" : stale ? "Refresh now" : "Refresh"}
          </button>
        )}
      </div>

      <dl className="grid gap-px bg-light-grey sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Estimated property value" value={formatGbp(intelligence.estimated_value_gbp)} />
        <Metric label="Latest property signal" value={intelligence.latest_trigger_type ? `${intelligence.latest_trigger_type}${intelligence.latest_trigger_date ? ` · ${formatDate(intelligence.latest_trigger_date)}` : ""}` : "No recent trigger"} />
        <Metric label="Last recorded transaction" value={intelligence.last_transaction_date ? `${formatDate(intelligence.last_transaction_date)}${intelligence.last_transaction_price_gbp ? ` · ${formatGbp(intelligence.last_transaction_price_gbp)}` : ""}` : "Not available"} />
        <Metric label="Likely to sell" value={intelligence.likely_to_sell_percentile !== null ? `Top ${Math.round(intelligence.likely_to_sell_percentile)}%` : "Not available"} />
      </dl>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">What changes the timing view</p>
          <ul className="mt-3 space-y-2">
            {intelligence.timing_reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm leading-6 text-charcoal">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-orange" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-light-grey bg-soft-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Property profile</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <SmallDetail label="Bedrooms" value={numberOrDash(intelligence.bedrooms)} />
            <SmallDetail label="Bathrooms" value={numberOrDash(intelligence.bathrooms)} />
            <SmallDetail label="Garden" value={yesNo(intelligence.garden)} />
            <SmallDetail label="Parking" value={yesNo(intelligence.parking)} />
            <SmallDetail label="UPRN" value={intelligence.uprn} />
            <SmallDetail label="Updated" value={formatDate(intelligence.retrieved_at)} />
          </dl>
        </div>
      </div>
      {error && <p className="px-5 pb-5 text-sm text-danger sm:px-6">{error}</p>}
    </section>
  );
}

function SignalBadge({ signal }: { signal: StoredPropertyIntelligence["timing_signal"] }) {
  const label = signal === "strong" ? "Recent activity" : signal === "positive" ? "Useful recency" : signal === "caution" ? "Review timing" : "Neutral activity";
  const classes = signal === "strong" ? "bg-success/10 text-success" : signal === "positive" ? "bg-signal-orange/10 text-signal-orange" : signal === "caution" ? "bg-warning/10 text-warning" : "bg-white text-slate";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${classes}`}>{label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-white p-4 sm:p-5"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt><dd className="mt-2 break-words text-sm font-bold leading-5 text-charcoal">{value}</dd></div>;
}

function SmallDetail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-[0.09em] text-slate">{label}</dt><dd className="mt-1 break-words font-semibold text-charcoal">{value}</dd></div>;
}

function formatGbp(value: number | null) {
  return value === null ? "Not available" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function numberOrDash(value: number | null) { return value === null ? "—" : String(value); }
function yesNo(value: boolean | null) { return value === null ? "—" : value ? "Yes" : "No"; }
function friendlyError(error?: string) {
  if (error === "property_not_matched") return "TwentyCI could not confidently match this project address to a property record.";
  if (error === "property_address_incomplete") return "This planning record does not contain enough address data for property enrichment.";
  return "Property intelligence could not be loaded right now.";
}
