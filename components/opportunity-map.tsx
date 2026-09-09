"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type OpportunityMapPoint = {
  postcode_district: string;
  post_town: string;
  latitude: number;
  longitude: number;
  opportunity_count: number;
  estimated_trade_value_low: number;
  estimated_trade_value_high: number;
  trade_category_id: string;
  trade_name: string;
  trade_slug: string;
  territory_status: "available" | "claimed" | string;
  monthly_price_pence: number;
};

type TradeOption = {
  id: string;
  slug: string;
  name: string;
};

export function OpportunityMap({
  points,
  trades,
}: {
  points: OpportunityMapPoint[];
  trades: TradeOption[];
}) {
  const tradeOptions = useMemo(
    () => trades.filter((trade) => points.some((point) => point.trade_slug === trade.slug)),
    [points, trades],
  );
  const [tradeSlug, setTradeSlug] = useState(tradeOptions[0]?.slug ?? "");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const filteredPoints = useMemo(
    () => points.filter((point) => !tradeSlug || point.trade_slug === tradeSlug),
    [points, tradeSlug],
  );

  const selected =
    filteredPoints.find((point) => point.postcode_district === selectedDistrict) ??
    filteredPoints[0] ??
    null;

  const bounds = useMemo(() => {
    if (filteredPoints.length === 0) {
      return { minLat: 50.5, maxLat: 55.8, minLng: -5.8, maxLng: 1.8 };
    }

    const lats = filteredPoints.map((point) => point.latitude);
    const lngs = filteredPoints.map((point) => point.longitude);
    const latRange = Math.max(Math.max(...lats) - Math.min(...lats), 0.5);
    const lngRange = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.8);

    return {
      minLat: Math.min(...lats) - latRange * 0.12,
      maxLat: Math.max(...lats) + latRange * 0.12,
      minLng: Math.min(...lngs) - lngRange * 0.12,
      maxLng: Math.max(...lngs) + lngRange * 0.12,
    };
  }, [filteredPoints]);

  function position(point: OpportunityMapPoint) {
    const x = ((point.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = 100 - ((point.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return {
      left: String(Math.min(94, Math.max(6, x))) + "%",
      top: String(Math.min(90, Math.max(10, y))) + "%",
    };
  }

  function selectTrade(value: string) {
    setTradeSlug(value);
    setSelectedDistrict(null);
  }

  return (
    <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity map</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">See where the signal is building.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            Select a trade, then click a postcode district to see live opportunity volume, indicative trade value and territory availability.
          </p>
        </div>
        <label className="block min-w-[190px]">
          <span className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">Trade view</span>
          <select
            value={tradeSlug}
            onChange={(event) => selectTrade(event.target.value)}
            className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm font-medium text-charcoal outline-none focus:border-signal-orange"
          >
            {tradeOptions.length > 1 && <option value="">All loaded trades</option>}
            {tradeOptions.map((trade) => (
              <option key={trade.id} value={trade.slug}>
                {trade.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredPoints.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-light-grey bg-soft-surface p-8 text-center">
          <p className="font-semibold text-charcoal">No mapped opportunities for this trade yet.</p>
          <p className="mt-2 text-sm leading-6 text-slate">Try another trade or check the coverage page for the latest loaded districts.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <div
            className="relative min-h-[360px] overflow-hidden rounded-2xl border border-[#d9e4e8] bg-[#eef4f5]"
            aria-label="Interactive opportunity map"
          >
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(83,110,120,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(83,110,120,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path
                d="M32 8 40 6 47 12 57 10 66 17 77 15 86 24 82 34 91 43 84 52 87 64 78 70 75 83 63 91 53 84 44 89 36 80 26 82 20 72 11 67 15 57 8 48 15 39 12 29 21 23 24 14Z"
                fill="rgba(255,255,255,0.7)"
                stroke="rgba(83,110,120,0.24)"
                strokeWidth="0.7"
              />
              <path d="M16 58h67M25 28l45 48M20 76l55-57" stroke="rgba(83,110,120,0.1)" strokeWidth="0.45" />
            </svg>

            <div className="absolute right-4 top-4 rounded-lg bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">
              N ↑
            </div>

            {filteredPoints.map((point) => {
              const active = selected?.postcode_district === point.postcode_district;
              const size = Math.min(54, 24 + Math.log2(point.opportunity_count + 1) * 8);
              const tone =
                point.territory_status === "available"
                  ? "border-white bg-signal-orange text-white"
                  : "border-white bg-charcoal text-white";
              return (
                <button
                  key={point.postcode_district + "-" + point.trade_slug}
                  type="button"
                  onClick={() => setSelectedDistrict(point.postcode_district)}
                  className={[
                    "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-[10px] font-bold shadow-lg transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-signal-orange focus:ring-offset-2",
                    tone,
                    active ? "ring-4 ring-signal-orange/25" : "",
                  ].join(" ")}
                  style={{ ...position(point), width: String(size) + "px", height: String(size) + "px" }}
                  aria-label={point.postcode_district + ": " + String(point.opportunity_count) + " opportunities"}
                >
                  {point.opportunity_count}
                </button>
              );
            })}

            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-xl bg-white/90 px-3 py-2 text-[10px] font-semibold text-slate shadow-sm">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-signal-orange" /> Available</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-charcoal" /> Claimed</span>
              <span className="text-slate/70">District-centre view</span>
            </div>
          </div>

          <div className="rounded-2xl border border-light-grey bg-soft-surface p-5">
            {selected ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Selected district</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">{selected.postcode_district}</h3>
                <p className="mt-1 text-sm text-slate">{selected.post_town} · {selected.trade_name}</p>
                <dl className="mt-5 space-y-3 border-t border-light-grey pt-4">
                  <MapMetric label="Opportunities" value={String(selected.opportunity_count)} />
                  <MapMetric label="Estimated trade value" value={formatGbp(selected.estimated_trade_value_low, selected.estimated_trade_value_high)} />
                  <MapMetric label="Territory" value={selected.territory_status === "available" ? "Available" : "Claimed"} />
                  <MapMetric label="Monthly price" value={formatGbp(selected.monthly_price_pence / 100)} />
                </dl>
                <Link
                  href={"/territories/" + encodeURIComponent(selected.postcode_district) + "/" + encodeURIComponent(selected.trade_slug)}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
                >
                  {selected.territory_status === "available" ? "Check and claim territory" : "View territory"} <span className="ml-2">→</span>
                </Link>
                <p className="mt-3 text-center text-xs leading-5 text-slate">Project addresses stay private until the territory is active.</p>
              </>
            ) : (
              <p className="text-sm leading-6 text-slate">Select a point to inspect this district.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MapMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-slate">{label}</dt>
      <dd className="font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

function formatGbp(low: number, high?: number): string {
  const format = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });
  if (high === undefined) return format.format(low);
  return format.format(low) + "–" + format.format(high);
}
