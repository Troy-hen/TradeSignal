"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
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

type TradeOption = { id: string; slug: string; name: string };
type MapViewport = { latitude: number; longitude: number; zoom: number };
type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  centerX: number;
  centerY: number;
  zoom: number;
};
type Cluster = {
  key: string;
  latitude: number;
  longitude: number;
  points: OpportunityMapPoint[];
  opportunityCount: number;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 12;
const TILE_RANGE = 2;
const CLUSTER_UNTIL_ZOOM = 9;
const CLUSTER_GRID_PX = 95;
const UK_BOUNDS = { minLatitude: 49.5, maxLatitude: 59.5, minLongitude: -8.5, maxLongitude: 2.2 };

export function OpportunityMap({ points, trades }: { points: OpportunityMapPoint[]; trades: TradeOption[] }) {
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
  const movingLayerRef = useRef<HTMLDivElement | null>(null);
  const filterKey = useMemo(
    () =>
      activeTradeSlug +
      ":" +
      filteredPoints.map((point) => point.postcode_district + "," + point.latitude + "," + point.longitude).join("|"),
    [activeTradeSlug, filteredPoints],
  );
  const visibleViewport = viewportKey === filterKey ? viewport : fitViewport(filteredPoints);
  const selected =
    filteredPoints.find((point) => point.postcode_district === selectedDistrict) ?? filteredPoints[0] ?? null;

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
          key: tileX + ":" + tileY,
          x: ((tileX % tileCount) + tileCount) % tileCount,
          y: tileY,
          offsetX: tileX * TILE_SIZE - center.x,
          offsetY: tileY * TILE_SIZE - center.y,
          zoom: visibleViewport.zoom,
        };
      }).filter((tile) => tile.y >= 0 && tile.y < tileCount),
    };
  }, [visibleViewport]);

  const clusters = useMemo(
    () => clusterPoints(filteredPoints, visibleViewport.zoom),
    [filteredPoints, visibleViewport.zoom],
  );

  function updateViewport(next: MapViewport | ((current: MapViewport) => MapViewport)) {
    setViewport((current) => {
      const base = viewportKey === filterKey ? current : fitViewport(filteredPoints);
      return clampViewport(typeof next === "function" ? next(base) : next);
    });
    setViewportKey(filterKey);
  }

  function selectTrade(value: string) {
    setTradeSlug(value);
    setSelectedDistrict(null);
  }

  function focusSelected() {
    if (selected) {
      updateViewport({
        latitude: selected.latitude,
        longitude: selected.longitude,
        zoom: Math.max(visibleViewport.zoom, 10),
      });
    }
  }

  function changeZoom(delta: number) {
    updateViewport((current) => ({
      ...current,
      zoom: clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM),
    }));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;

    const center = project(visibleViewport.latitude, visibleViewport.longitude, visibleViewport.zoom);
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      centerX: center.x,
      centerY: center.y,
      zoom: visibleViewport.zoom,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = panState.current;
    if (!current || current.pointerId !== event.pointerId) return;

    current.lastX = event.clientX;
    current.lastY = event.clientY;
    const dx = current.lastX - current.startX;
    const dy = current.lastY - current.startY;

    // Keep pointer-move work outside React state. The map follows the cursor
    // immediately, then the geographic viewport is committed once on release.
    // This avoids re-rendering tiles, markers and clusters on every mouse move,
    // which is especially noticeable in embedded/webview browsers.
    if (movingLayerRef.current) {
      movingLayerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  }

  function finishPan(event: PointerEvent<HTMLDivElement>) {
    const current = panState.current;
    if (!current || current.pointerId !== event.pointerId) return;

    const dx = current.lastX - current.startX;
    const dy = current.lastY - current.startY;
    panState.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      const nextCenter = unproject(current.centerX - dx, current.centerY - dy, current.zoom);
      updateViewport({
        latitude: nextCenter.latitude,
        longitude: nextCenter.longitude,
        zoom: current.zoom,
      });
    }

    requestAnimationFrame(() => {
      if (movingLayerRef.current) movingLayerRef.current.style.transform = "";
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(event.deltaY > 0 ? -1 : 1);
  }

  return (
    <section className="min-w-0 rounded-3xl border border-light-grey bg-white p-4 sm:p-7">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity map</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">See where the signal is building.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            At wider zoom levels nearby districts are grouped into clusters to keep the map fast and readable. Zoom in or select a cluster to inspect individual territories.
          </p>
        </div>
        <label className="block min-w-0 sm:min-w-[190px]">
          <span className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">Trade view</span>
          <select
            value={activeTradeSlug}
            onChange={(event) => selectTrade(event.target.value)}
            className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm font-medium text-charcoal outline-none focus:border-signal-orange"
          >
            {tradeOptions.length > 1 && <option value="">All loaded trades</option>}
            {tradeOptions.map((trade) => (
              <option key={trade.id} value={trade.slug}>{trade.name}</option>
            ))}
          </select>
        </label>
      </div>

      {filteredPoints.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-light-grey bg-soft-surface p-8 text-center">
          <p className="font-semibold text-charcoal">No mapped opportunities for this trade yet.</p>
          <p className="mt-2 text-sm text-slate">Try another trade or use Data coverage to see which districts are loaded.</p>
        </div>
      ) : (
        <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <div
            className={[
              "relative min-h-[360px] min-w-0 overflow-hidden rounded-2xl border border-[#cbd9de] bg-[#e8f0f2] [touch-action:none] sm:min-h-[480px]",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            ].join(" ")}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPan}
            onPointerCancel={finishPan}
            onWheel={handleWheel}
          >
            <div ref={movingLayerRef} className="absolute inset-0 will-change-transform">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {tileData.tiles.map((tile) => (
                  <img
                    key={tile.key}
                    src={`https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`}
                    alt=""
                    draggable={false}
                    className="absolute h-64 w-64 max-w-none select-none opacity-90"
                    style={{
                      left: `calc(50% + ${tile.offsetX}px)`,
                      top: `calc(50% + ${tile.offsetY}px)`,
                    }}
                  />
                ))}
              </div>

              {clusters.map((cluster) => {
                const pixel = project(cluster.latitude, cluster.longitude, visibleViewport.zoom);
                if (cluster.points.length > 1) {
                  return (
                    <button
                      key={cluster.key}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() =>
                        updateViewport({
                          latitude: cluster.latitude,
                          longitude: cluster.longitude,
                          zoom: Math.min(CLUSTER_UNTIL_ZOOM + 1, visibleViewport.zoom + 2),
                        })
                      }
                      className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-charcoal text-white shadow-xl transition hover:scale-105"
                      style={{
                        left: `calc(50% + ${pixel.x - tileData.center.x}px)`,
                        top: `calc(50% + ${pixel.y - tileData.center.y}px)`,
                        width: 54,
                        height: 54,
                      }}
                      aria-label={`${cluster.points.length} districts, ${cluster.opportunityCount} opportunities`}
                    >
                      <span className="text-center">
                        <span className="block text-sm font-bold leading-none">{cluster.points.length}</span>
                        <span className="mt-1 block text-[8px] font-semibold uppercase leading-none text-white/70">districts</span>
                      </span>
                    </button>
                  );
                }

                const point = cluster.points[0];
                const active = selected?.postcode_district === point.postcode_district;
                const size = Math.min(56, 26 + Math.log2(point.opportunity_count + 1) * 8);
                return (
                  <button
                    key={cluster.key}
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setSelectedDistrict(point.postcode_district)}
                    className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-lg p-1 text-[10px] font-bold transition hover:z-40 hover:scale-105 ${active ? "ring-4 ring-signal-orange/25" : ""}`}
                    style={{
                      left: `calc(50% + ${pixel.x - tileData.center.x}px)`,
                      top: `calc(50% + ${pixel.y - tileData.center.y}px)`,
                    }}
                  >
                    <span
                      className={`flex items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${point.territory_status === "available" ? "bg-signal-orange" : "bg-charcoal"}`}
                      style={{ width: size, height: size }}
                    >
                      {point.opportunity_count}
                    </span>
                    <span className="mt-1 max-w-[110px] truncate rounded-md bg-white/95 px-1.5 py-0.5 text-charcoal shadow-sm">
                      {point.post_town || point.postcode_district}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-none absolute inset-0 bg-white/10" />
            <div className="absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-lg">
              <Control label="Zoom in" onClick={() => changeZoom(1)}>+</Control>
              <Control label="Zoom out" onClick={() => changeZoom(-1)}>−</Control>
              <Control label="Reset map" onClick={() => updateViewport(fitViewport(filteredPoints))}>↺</Control>
            </div>
            <div className="absolute left-3 top-3 z-30 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate shadow-sm">
              {visibleViewport.zoom < CLUSTER_UNTIL_ZOOM ? "Select a cluster to zoom" : "Drag · zoom · select"}
            </div>
            <div className="absolute bottom-3 left-3 z-30 flex flex-wrap gap-2 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate shadow-sm">
              <span>🟠 Available</span><span>⚫ Claimed</span><span className="text-slate/70">© OpenStreetMap contributors</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-light-grey bg-soft-surface p-5">
            {selected ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Selected district</p>
                <h3 className="mt-2 text-2xl font-bold text-charcoal">{selected.postcode_district}</h3>
                <p className="mt-1 text-sm text-slate">{selected.post_town || "Local area"} · {selected.trade_name}</p>
                <dl className="mt-5 space-y-3 border-t border-light-grey pt-4">
                  <Metric label="Opportunities" value={String(selected.opportunity_count)} />
                  <Metric label="Estimated trade value" value={formatGbp(selected.estimated_trade_value_low, selected.estimated_trade_value_high)} />
                  <Metric label="Territory" value={selected.territory_status === "available" ? "Available" : "Claimed"} />
                  <Metric label="Monthly price" value={formatMonthlyGbp(selected.monthly_price_pence)} />
                </dl>
                <button type="button" onClick={focusSelected} className="mt-5 w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm font-semibold text-charcoal hover:border-signal-orange">
                  Focus on {selected.post_town || selected.postcode_district}
                </button>
                <Link href={`/territories/${encodeURIComponent(selected.postcode_district)}/${encodeURIComponent(selected.trade_slug)}`} className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white">
                  {selected.territory_status === "available" ? "Check and claim territory" : "View territory"} →
                </Link>
                <div className="mt-4">
                  <LockedOpportunityPreview
                    compact
                    title="Add the district to My coverage to unlock the full brief"
                    body="The project, status and indicative trade value are shown as a preview. Addresses and planning detail stay private until the territory is active."
                    teaser={{
                      projectType: selected.teaser_project_type,
                      status: selected.teaser_status,
                      estimatedTradeValueLow: selected.teaser_estimated_trade_value_low,
                      estimatedTradeValueHigh: selected.teaser_estimated_trade_value_high,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate">Select a district to inspect it.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function clusterPoints(points: OpportunityMapPoint[], zoom: number): Cluster[] {
  if (zoom >= CLUSTER_UNTIL_ZOOM) {
    return points.map((point) => ({
      key: point.postcode_district + ":" + point.trade_slug,
      latitude: point.latitude,
      longitude: point.longitude,
      points: [point],
      opportunityCount: point.opportunity_count,
    }));
  }

  const groups = new Map<string, OpportunityMapPoint[]>();
  for (const point of points) {
    const pixel = project(point.latitude, point.longitude, zoom);
    const key = Math.floor(pixel.x / CLUSTER_GRID_PX) + ":" + Math.floor(pixel.y / CLUSTER_GRID_PX);
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, group]) => ({
    key: "cluster:" + key,
    latitude: group.reduce((sum, point) => sum + point.latitude, 0) / group.length,
    longitude: group.reduce((sum, point) => sum + point.longitude, 0) / group.length,
    points: group,
    opportunityCount: group.reduce((sum, point) => sum + point.opportunity_count, 0),
  }));
}

function Control({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-slate">{label}</dt>
      <dd className="text-right font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

function fitViewport(points: OpportunityMapPoint[]): MapViewport {
  if (!points.length) return { latitude: 52.7, longitude: -1.1, zoom: 6 };
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const span = Math.max(maxLng - minLng, maxLat - minLat, 0.4);
  return clampViewport({ latitude, longitude, zoom: clamp(Math.floor(Math.log2(130 / span)), MIN_ZOOM, 10) });
}

function clampViewport(viewport: MapViewport): MapViewport {
  return {
    latitude: clamp(viewport.latitude, UK_BOUNDS.minLatitude, UK_BOUNDS.maxLatitude),
    longitude: clamp(viewport.longitude, UK_BOUNDS.minLongitude, UK_BOUNDS.maxLongitude),
    zoom: clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

function project(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const safe = clamp(latitude, -85.05112878, 85.05112878);
  const sine = Math.sin((safe * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return { latitude: (180 / Math.PI) * Math.atan(Math.sinh(n)), longitude };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMonthlyGbp(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}

function formatGbp(low: number, high?: number) {
  const formatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  return high === undefined ? formatter.format(low) : formatter.format(low) + "–" + formatter.format(high);
}
