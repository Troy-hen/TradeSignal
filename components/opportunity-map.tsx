"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from "react";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";

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
  teaser_project_type?: string | null;
  teaser_status?: string | null;
  teaser_estimated_trade_value_low?: number | null;
  teaser_estimated_trade_value_high?: number | null;
};

type TradeOption = {
  id: string;
  slug: string;
  name: string;
};

type MapViewport = {
  latitude: number;
  longitude: number;
  zoom: number;
};

type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  centerX: number;
  centerY: number;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 12;
const TILE_RANGE = 2;
const UK_BOUNDS = {
  minLatitude: 49.5,
  maxLatitude: 59.5,
  minLongitude: -8.5,
  maxLongitude: 2.2,
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
  const activeTradeSlug =
    tradeSlug === "" || tradeOptions.some((trade) => trade.slug === tradeSlug)
      ? tradeSlug
      : tradeOptions[0]?.slug ?? "";
  const filteredPoints = useMemo(
    () => points.filter((point) => !activeTradeSlug || point.trade_slug === activeTradeSlug),
    [activeTradeSlug, points],
  );
  const [viewport, setViewport] = useState<MapViewport>(() => fitViewport(filteredPoints));
  const [viewportKey, setViewportKey] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const panState = useRef<PanState | null>(null);
  const filterKey = useMemo(
    () =>
      activeTradeSlug +
      ":" +
      filteredPoints.map((point) => point.postcode_district + "," + point.latitude + "," + point.longitude).join("|"),
    [activeTradeSlug, filteredPoints],
  );
  const visibleViewport = viewportKey === filterKey ? viewport : fitViewport(filteredPoints);

  const selected =
    filteredPoints.find((point) => point.postcode_district === selectedDistrict) ??
    filteredPoints[0] ??
    null;

  const tileData = useMemo(() => {
    const center = project(visibleViewport.latitude, visibleViewport.longitude, visibleViewport.zoom);
    const centerTileX = Math.floor(center.x / TILE_SIZE);
    const centerTileY = Math.floor(center.y / TILE_SIZE);
    const tileCount = 2 ** visibleViewport.zoom;

    return {
      center,
      tiles: Array.from({ length: (TILE_RANGE * 2 + 1) ** 2 }, (_, index) => {
        const offsetX = (index % (TILE_RANGE * 2 + 1)) - TILE_RANGE;
        const offsetY = Math.floor(index / (TILE_RANGE * 2 + 1)) - TILE_RANGE;
        const tileX = centerTileX + offsetX;
        const tileY = centerTileY + offsetY;
        return {
          key: String(tileX) + ":" + String(tileY),
          x: ((tileX % tileCount) + tileCount) % tileCount,
          y: tileY,
          offsetX: tileX * TILE_SIZE - center.x,
          offsetY: tileY * TILE_SIZE - center.y,
          zoom: visibleViewport.zoom,
        };
      }).filter((tile) => tile.y >= 0 && tile.y < tileCount),
    };
  }, [visibleViewport]);

  function updateViewport(next: MapViewport | ((current: MapViewport) => MapViewport)) {
    setViewport((current) => {
      const base = viewportKey === filterKey ? current : fitViewport(filteredPoints);
      const updated = typeof next === "function" ? next(base) : next;
      return clampViewport(updated);
    });
    setViewportKey(filterKey);
  }

  function selectTrade(value: string) {
    setTradeSlug(value);
  }

  function selectDistrict(point: OpportunityMapPoint) {
    setSelectedDistrict(point.postcode_district);
  }

  function focusSelected() {
    if (!selected) return;
    updateViewport({
      latitude: selected.latitude,
      longitude: selected.longitude,
      zoom: Math.max(visibleViewport.zoom, 10),
    });
  }

  function resetViewport() {
    updateViewport(fitViewport(filteredPoints));
  }

  function changeZoom(delta: number) {
    updateViewport((current) => ({
      ...current,
      zoom: clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM),
    }));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    const center = project(visibleViewport.latitude, visibleViewport.longitude, visibleViewport.zoom);
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centerX: center.x,
      centerY: center.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = panState.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const nextCenter = unproject(
      current.centerX - (event.clientX - current.startX),
      current.centerY - (event.clientY - current.startY),
      visibleViewport.zoom,
    );
    updateViewport((currentViewport) => ({
      ...currentViewport,
      latitude: nextCenter.latitude,
      longitude: nextCenter.longitude,
    }));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (panState.current?.pointerId !== event.pointerId) return;
    panState.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(event.deltaY > 0 ? -1 : 1);
  }

  return (
    <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity map</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">See where the signal is building.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            Drag the map to explore the area, zoom into the town and click a live postcode district to inspect its opportunity volume, indicative value and territory availability.
          </p>
        </div>
        <label className="block min-w-[190px]">
          <span className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">Trade view</span>
          <select
            value={activeTradeSlug}
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
            className={[
              "relative min-h-[420px] overflow-hidden rounded-2xl border border-[#cbd9de] bg-[#e8f0f2] [touch-action:none]",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            ].join(" ")}
            aria-label="Interactive opportunity map"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(83,110,120,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(83,110,120,0.1)_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {tileData.tiles.map((tile) => (
                // OSM tiles are already optimised CDN assets; proxying each tile
                // through Next Image would add latency and unnecessary bandwidth.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={tile.key}
                  src={
                    "https://tile.openstreetmap.org/" +
                    String(tile.zoom) +
                    "/" +
                    String(tile.x) +
                    "/" +
                    String(tile.y) +
                    ".png"
                  }
                  alt=""
                  draggable={false}
                  className="absolute h-64 w-64 max-w-none select-none opacity-90"
                  style={{
                    left: "calc(50% + " + String(tile.offsetX) + "px)",
                    top: "calc(50% + " + String(tile.offsetY) + "px)",
                  }}
                />
              ))}
            </div>

            <div className="pointer-events-none absolute inset-0 bg-white/10" />

            <div className="absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-lg">
              <MapControlButton label="Zoom in" onClick={() => changeZoom(1)}>
                +
              </MapControlButton>
              <MapControlButton label="Zoom out" onClick={() => changeZoom(-1)}>
                −
              </MapControlButton>
              <MapControlButton label="Reset map" onClick={resetViewport}>
                <ResetIcon />
              </MapControlButton>
            </div>

            <div className="absolute left-3 top-3 z-30 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate shadow-sm">
              Drag · scroll · click a district
            </div>

            {filteredPoints.map((point) => {
              const active = selected?.postcode_district === point.postcode_district;
              const pointPixel = project(point.latitude, point.longitude, visibleViewport.zoom);
              const size = Math.min(56, 26 + Math.log2(point.opportunity_count + 1) * 8);
              const tone =
                point.territory_status === "available"
                  ? "border-white bg-signal-orange text-white"
                  : "border-white bg-charcoal text-white";

              return (
                <button
                  key={point.postcode_district + "-" + point.trade_slug}
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => selectDistrict(point)}
                  className={[
                    "absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-lg p-1 text-[10px] font-bold transition hover:z-40 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-signal-orange focus:ring-offset-2",
                    active ? "ring-4 ring-signal-orange/25" : "",
                  ].join(" ")}
                  style={{
                    left: "calc(50% + " + String(pointPixel.x - tileData.center.x) + "px)",
                    top: "calc(50% + " + String(pointPixel.y - tileData.center.y) + "px)",
                  }}
                  aria-label={
                    point.postcode_district +
                    ", " +
                    (point.post_town || "local area") +
                    ": " +
                    String(point.opportunity_count) +
                    " opportunities"
                  }
                >
                  <span
                    className={[
                      "flex items-center justify-center rounded-full border-2 shadow-lg",
                      tone,
                    ].join(" ")}
                    style={{ width: String(size) + "px", height: String(size) + "px" }}
                  >
                    {point.opportunity_count}
                  </span>
                  <span className="mt-1 max-w-[120px] whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-charcoal shadow-sm">
                    {point.post_town || point.postcode_district}
                  </span>
                </button>
              );
            })}

            <div className="absolute bottom-3 left-3 z-30 flex flex-wrap gap-2 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate shadow-sm">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-signal-orange" /> Available</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-charcoal" /> Claimed</span>
              <span className="text-slate/70">© OpenStreetMap contributors</span>
            </div>
          </div>

          <div className="rounded-2xl border border-light-grey bg-soft-surface p-5">
            {selected ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Selected district</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">{selected.postcode_district}</h3>
                <p className="mt-1 text-sm text-slate">{selected.post_town || "Local area"} · {selected.trade_name}</p>
                <dl className="mt-5 space-y-3 border-t border-light-grey pt-4">
                  <MapMetric label="Opportunities" value={String(selected.opportunity_count)} />
                  <MapMetric label="Estimated trade value" value={formatGbp(selected.estimated_trade_value_low, selected.estimated_trade_value_high)} />
                  <MapMetric label="Territory" value={selected.territory_status === "available" ? "Available" : "Claimed"} />
                  <MapMetric label="Monthly price" value={formatMonthlyGbp(selected.monthly_price_pence)} />
                </dl>
                <button
                  type="button"
                  onClick={focusSelected}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-light-grey bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:border-signal-orange hover:text-signal-orange"
                >
                  Focus on {selected.post_town || selected.postcode_district}
                </button>
                <Link
                  href={"/territories/" + encodeURIComponent(selected.postcode_district) + "/" + encodeURIComponent(selected.trade_slug)}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
                >
                  {selected.territory_status === "available" ? "Check and claim territory" : "View territory"} <span className="ml-2">→</span>
                </Link>
                <div className="mt-4">
                  <LockedOpportunityPreview
                    compact
                    title="Claim the district to unlock the full brief"
                    body="The project, status and indicative trade value are shown as a preview. Addresses and planning detail stay private until the territory is active."
                    teaser={{
                      projectType: selected.teaser_project_type,
                      status: selected.teaser_status,
                      estimatedTradeValueLow: selected.teaser_estimated_trade_value_low,
                      estimatedTradeValueHigh: selected.teaser_estimated_trade_value_high,
                    }}
                  />
                </div>
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

function MapControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border-b border-light-grey text-lg font-semibold text-charcoal last:border-b-0 hover:bg-soft-surface"
    >
      {children}
    </button>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12a7 7 0 1 0 2-4.9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v5h5" />
    </svg>
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

function fitViewport(points: OpportunityMapPoint[]): MapViewport {
  if (points.length === 0) {
    return clampViewport({ latitude: 52.7, longitude: -1.1, zoom: 6 });
  }

  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const longitudeSpan = Math.max(maxLng - minLng, 0.45);
  const latitudeSpan = Math.max(maxLat - minLat, 0.35);
  const widthZoom = Math.log2((360 * 760) / (TILE_SIZE * longitudeSpan * 1.35));
  const heightZoom = Math.log2((360 * 420) / (TILE_SIZE * latitudeSpan * 1.35));
  const zoom = clamp(Math.floor(Math.min(widthZoom, heightZoom)), MIN_ZOOM, 10);

  return clampViewport({ latitude, longitude, zoom });
}

function clampViewport(viewport: MapViewport): MapViewport {
  return {
    latitude: clamp(viewport.latitude, UK_BOUNDS.minLatitude, UK_BOUNDS.maxLatitude),
    longitude: clamp(viewport.longitude, UK_BOUNDS.minLongitude, UK_BOUNDS.maxLongitude),
    zoom: clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

function project(latitude: number, longitude: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const safeLatitude = clamp(latitude, -85.05112878, 85.05112878);
  const sine = Math.sin((safeLatitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number): { latitude: number; longitude: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { latitude, longitude };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatMonthlyGbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
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
