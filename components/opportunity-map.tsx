"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";
import type { MarketSignalMapPoint } from "@/lib/data/opportunity-map";

export type OpportunityMapPoint = {
  postcode_district: string;
  post_town: string;
  latitude: number;
  longitude: number;
  opportunity_count: number;
  estimated_trade_value_low: number;
  estimated_trade_value_high: number;
  commercial_opportunity_count?: number;
  commercial_estimated_trade_value_low?: number;
  commercial_estimated_trade_value_high?: number;
  trade_category_id: string;
  trade_name: string;
  trade_slug: string;
  territory_status: "available" | "claimed" | string;
  monthly_price_pence: number;
  teaser_project_type?: string | null;
  teaser_status?: string | null;
  teaser_estimated_trade_value_low?: number | null;
  teaser_estimated_trade_value_high?: number | null;
  commercial_teaser_project_type?: string | null;
  commercial_teaser_status?: string | null;
  commercial_teaser_estimated_trade_value_low?: number | null;
  commercial_teaser_estimated_trade_value_high?: number | null;
};

type TradeOption = { id: string; slug: string; name: string };
type MapViewport = { latitude: number; longitude: number; zoom: number };
type MapCoordinate = { latitude: number; longitude: number };
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
type Selection =
  | { kind: "district"; key: string }
  | { kind: "signal"; id: string }
  | null;
type SourceFilter = "" | "planning" | "tender" | "public_pipeline" | "contract_award" | "commercial_development";

const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: "", label: "All work" },
  { value: "planning", label: "Planning" },
  { value: "tender", label: "Tenders" },
  { value: "public_pipeline", label: "Public pipeline" },
  { value: "contract_award", label: "Awards" },
  { value: "commercial_development", label: "Commercial builds" },
];

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 12;
const TILE_RANGE = 2;
const CLUSTER_UNTIL_ZOOM = 9;
const CLUSTER_GRID_PX = 95;
const UK_BOUNDS = { minLatitude: 49.5, maxLatitude: 59.5, minLongitude: -8.5, maxLongitude: 2.2 };

export function OpportunityMap({ points, signals, trades }: {
  points: OpportunityMapPoint[];
  signals: MarketSignalMapPoint[];
  trades: TradeOption[];
}) {
  const tradeOptions = useMemo(
    () => trades.filter((trade) => points.some((point) => point.trade_slug === trade.slug) || signals.some((signal) => signal.trade_slug === trade.slug)),
    [points, signals, trades],
  );
  const [tradeSlug, setTradeSlug] = useState(tradeOptions[0]?.slug ?? "");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("");
  const [selection, setSelection] = useState<Selection>(null);
  const [viewport, setViewport] = useState<MapViewport>(() => fitViewport(points));
  const [viewportKey, setViewportKey] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const panState = useRef<PanState | null>(null);
  const movingLayerRef = useRef<HTMLDivElement | null>(null);
  const mapSurfaceRef = useRef<HTMLDivElement | null>(null);
  const wheelActionRef = useRef<(deltaY: number) => void>(() => undefined);
  const lastWheelZoomRef = useRef(0);

  const activeTradeSlug = tradeSlug === "" || tradeOptions.some((trade) => trade.slug === tradeSlug) ? tradeSlug : tradeOptions[0]?.slug ?? "";
  const tradePoints = useMemo(() => points.filter((point) => !activeTradeSlug || point.trade_slug === activeTradeSlug), [activeTradeSlug, points]);
  const tradeSignals = useMemo(() => signals.filter((signal) => !activeTradeSlug || signal.trade_slug === activeTradeSlug), [activeTradeSlug, signals]);

  const planningPoints = useMemo(() => {
    if (sourceFilter === "tender" || sourceFilter === "public_pipeline" || sourceFilter === "contract_award") return [];
    if (sourceFilter !== "commercial_development") return tradePoints;
    return tradePoints
      .filter((point) => Number(point.commercial_opportunity_count ?? 0) > 0)
      .map((point) => ({
        ...point,
        opportunity_count: Number(point.commercial_opportunity_count ?? 0),
        estimated_trade_value_low: Number(point.commercial_estimated_trade_value_low ?? 0),
        estimated_trade_value_high: Number(point.commercial_estimated_trade_value_high ?? 0),
        teaser_project_type: point.commercial_teaser_project_type ?? null,
        teaser_status: point.commercial_teaser_status ?? null,
        teaser_estimated_trade_value_low: point.commercial_teaser_estimated_trade_value_low ?? null,
        teaser_estimated_trade_value_high: point.commercial_teaser_estimated_trade_value_high ?? null,
      }));
  }, [sourceFilter, tradePoints]);

  const marketSignals = useMemo(() => {
    if (sourceFilter === "planning") return [];
    if (!sourceFilter) return tradeSignals;
    return tradeSignals.filter((signal) => signal.signal_type === sourceFilter);
  }, [sourceFilter, tradeSignals]);

  const sourceCounts = useMemo(() => {
    const planning = tradePoints.reduce((sum, point) => sum + Number(point.opportunity_count ?? 0), 0);
    const commercialPlanning = tradePoints.reduce((sum, point) => sum + Number(point.commercial_opportunity_count ?? 0), 0);
    const signalCount = (type: string) => tradeSignals.filter((signal) => signal.signal_type === type).length;
    return {
      "": planning + tradeSignals.length,
      planning,
      tender: signalCount("tender"),
      public_pipeline: signalCount("public_pipeline"),
      contract_award: signalCount("contract_award"),
      commercial_development: commercialPlanning + signalCount("commercial_development"),
    } satisfies Record<SourceFilter, number>;
  }, [tradePoints, tradeSignals]);

  const mapCoordinates = useMemo<MapCoordinate[]>(
    () => [
      ...planningPoints.map(({ latitude, longitude }) => ({ latitude, longitude })),
      ...marketSignals.map(({ latitude, longitude }) => ({ latitude, longitude })),
    ],
    [marketSignals, planningPoints],
  );

  const filterKey = useMemo(
    () => [
      activeTradeSlug,
      sourceFilter,
      ...mapCoordinates.map((point) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`),
    ].join("|"),
    [activeTradeSlug, mapCoordinates, sourceFilter],
  );
  const visibleViewport = viewportKey === filterKey ? viewport : fitViewport(mapCoordinates);

  const selectedDistrict = selection?.kind === "district" ? planningPoints.find((point) => planningKey(point) === selection.key) ?? null : null;
  const selectedSignal = selection?.kind === "signal" ? marketSignals.find((signal) => signal.market_signal_trade_match_id === selection.id) ?? null : null;

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
          key: `${tileX}:${tileY}`,
          x: ((tileX % tileCount) + tileCount) % tileCount,
          y: tileY,
          offsetX: tileX * TILE_SIZE - center.x,
          offsetY: tileY * TILE_SIZE - center.y,
          zoom: visibleViewport.zoom,
        };
      }).filter((tile) => tile.y >= 0 && tile.y < tileCount),
    };
  }, [visibleViewport]);

  const clusters = useMemo(() => clusterPoints(planningPoints, visibleViewport.zoom), [planningPoints, visibleViewport.zoom]);
  const signalOffsets = useMemo(() => buildSignalOffsets(marketSignals), [marketSignals]);

  function updateViewport(next: MapViewport | ((current: MapViewport) => MapViewport)) {
    setViewport((current) => {
      const base = viewportKey === filterKey ? current : fitViewport(mapCoordinates);
      return clampViewport(typeof next === "function" ? next(base) : next);
    });
    setViewportKey(filterKey);
  }

  function changeZoom(delta: number) {
    updateViewport((current) => ({ ...current, zoom: clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM) }));
  }

  wheelActionRef.current = (deltaY: number) => {
    const now = Date.now();
    if (now - lastWheelZoomRef.current < 110) return;
    lastWheelZoomRef.current = now;
    changeZoom(deltaY > 0 ? -1 : 1);
  };

  useEffect(() => {
    const surface = mapSurfaceRef.current;
    if (!surface) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      wheelActionRef.current(event.deltaY);
    };
    surface.addEventListener("wheel", handleWheel, { passive: false });
    return () => surface.removeEventListener("wheel", handleWheel);
  }, []);

  function selectTrade(value: string) {
    setTradeSlug(value);
    setSelection(null);
  }

  function selectSource(value: SourceFilter) {
    setSourceFilter(value);
    setSelection(null);
  }

  function focusSelection() {
    const selected = selectedSignal ?? selectedDistrict;
    if (!selected) return;
    updateViewport({ latitude: selected.latitude, longitude: selected.longitude, zoom: Math.max(visibleViewport.zoom, selectedSignal?.location_scope === "regional" ? 7 : 10) });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (event.target instanceof HTMLElement && event.target.closest("button,a,select,input")) return;
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
    if (movingLayerRef.current) movingLayerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }

  function finishPan(event: PointerEvent<HTMLDivElement>) {
    const current = panState.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = current.lastX - current.startX;
    const dy = current.lastY - current.startY;
    panState.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      const nextCenter = unproject(current.centerX - dx, current.centerY - dy, current.zoom);
      updateViewport({ latitude: nextCenter.latitude, longitude: nextCenter.longitude, zoom: current.zoom });
    }
    requestAnimationFrame(() => { if (movingLayerRef.current) movingLayerRef.current.style.transform = ""; });
  }

  const hasMapData = planningPoints.length > 0 || marketSignals.length > 0;

  return (
    <section className="min-w-0 rounded-3xl border border-light-grey bg-white p-4 sm:p-7">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity map</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">See every signal building in the patch.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Planning, commercial builds, public pipeline, live tenders and contract awards now share one map. Regional procurement notices are shown as approximate regional markers rather than pretending they belong to a single postcode.</p>
        </div>
        <label className="block min-w-0 sm:min-w-[210px]">
          <span className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">Trade view</span>
          <select value={activeTradeSlug} onChange={(event) => selectTrade(event.target.value)} className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm font-medium text-charcoal outline-none focus:border-signal-orange">
            {tradeOptions.length > 1 && <option value="">All loaded trades</option>}
            {tradeOptions.map((trade) => <option key={trade.id} value={trade.slug}>{trade.name}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {SOURCE_OPTIONS.map((option) => (
          <button key={option.value || "all"} type="button" onClick={() => selectSource(option.value)} className={`min-w-max rounded-xl border px-3 py-2 text-xs font-semibold transition ${sourceFilter === option.value ? "border-signal-orange bg-signal-orange text-white" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}>
            {option.label} <span className={sourceFilter === option.value ? "text-white/75" : "text-slate"}>{sourceCounts[option.value]}</span>
          </button>
        ))}
      </div>

      {!hasMapData ? (
        <div className="mt-6 rounded-2xl border border-dashed border-light-grey bg-soft-surface p-8 text-center">
          <p className="font-semibold text-charcoal">No mapped {sourceLabel(sourceFilter).toLowerCase()} for this trade yet.</p>
          <p className="mt-2 text-sm text-slate">Try another source layer or trade.</p>
        </div>
      ) : (
        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.45fr)]">
          <div
            ref={mapSurfaceRef}
            className={["relative min-h-[390px] min-w-0 overflow-hidden rounded-2xl border border-[#cbd9de] bg-[#e8f0f2] [overscroll-behavior:contain] [touch-action:none] sm:min-h-[520px]", isDragging ? "cursor-grabbing" : "cursor-grab"].join(" ")}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPan}
            onPointerCancel={finishPan}
          >
            <div ref={movingLayerRef} className="absolute inset-0 will-change-transform">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {tileData.tiles.map((tile) => (
                  <img key={tile.key} src={`https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`} alt="" draggable={false} className="absolute h-64 w-64 max-w-none select-none opacity-90" style={{ left: `calc(50% + ${tile.offsetX}px)`, top: `calc(50% + ${tile.offsetY}px)` }} />
                ))}
              </div>

              {clusters.map((cluster) => {
                const pixel = project(cluster.latitude, cluster.longitude, visibleViewport.zoom);
                if (cluster.points.length > 1) {
                  return (
                    <button key={cluster.key} type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => updateViewport({ latitude: cluster.latitude, longitude: cluster.longitude, zoom: Math.min(CLUSTER_UNTIL_ZOOM + 1, visibleViewport.zoom + 2) })} className="absolute z-20 flex h-13 w-13 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-charcoal text-white shadow-xl transition hover:scale-105" style={{ left: `calc(50% + ${pixel.x - tileData.center.x}px)`, top: `calc(50% + ${pixel.y - tileData.center.y}px)` }} aria-label={`${cluster.points.length} districts, ${cluster.opportunityCount} planning opportunities`}>
                      <span className="text-center"><span className="block text-sm font-bold leading-none">{cluster.opportunityCount}</span><span className="mt-1 block text-[8px] font-semibold uppercase leading-none text-white/70">planning</span></span>
                    </button>
                  );
                }
                const point = cluster.points[0];
                const active = selectedDistrict ? planningKey(selectedDistrict) === planningKey(point) : false;
                const size = Math.min(54, 28 + Math.log2(point.opportunity_count + 1) * 7);
                return (
                  <button key={cluster.key} type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setSelection({ kind: "district", key: planningKey(point) })} className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-lg p-1 text-[10px] font-bold transition hover:z-40 hover:scale-105 ${active ? "ring-4 ring-signal-orange/25" : ""}`} style={{ left: `calc(50% + ${pixel.x - tileData.center.x}px)`, top: `calc(50% + ${pixel.y - tileData.center.y}px)` }}>
                    <span className={`flex items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${point.territory_status === "available" ? "bg-signal-orange" : "bg-charcoal"}`} style={{ width: size, height: size }}>{point.opportunity_count}</span>
                    <span className="mt-1 max-w-[100px] truncate rounded-md bg-white/95 px-1.5 py-0.5 text-charcoal shadow-sm">{point.post_town || point.postcode_district}</span>
                  </button>
                );
              })}

              {marketSignals.map((signal) => {
                const pixel = project(signal.latitude, signal.longitude, visibleViewport.zoom);
                const offset = signalOffsets.get(signal.market_signal_trade_match_id) ?? { x: 0, y: 0 };
                const active = selectedSignal?.market_signal_trade_match_id === signal.market_signal_trade_match_id;
                const visual = signalVisual(signal.signal_type, signal.location_scope);
                return (
                  <button
                    key={signal.market_signal_trade_match_id}
                    type="button"
                    title={signal.title}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setSelection({ kind: "signal", id: signal.market_signal_trade_match_id })}
                    className={`absolute z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 text-xs font-black shadow-lg transition hover:z-50 hover:scale-110 ${visual} ${active ? "ring-4 ring-signal-orange/25" : ""}`}
                    style={{ left: `calc(50% + ${pixel.x - tileData.center.x + offset.x}px)`, top: `calc(50% + ${pixel.y - tileData.center.y + offset.y}px)` }}
                    aria-label={`${sourceLabel(signal.signal_type)}: ${signal.title}`}
                  >
                    {sourceIcon(signal.signal_type)}
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-none absolute inset-0 bg-white/[0.06]" />
            <div className="absolute right-3 top-3 z-40 flex flex-col overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-lg">
              <Control label="Zoom in" onClick={() => changeZoom(1)}>+</Control>
              <Control label="Zoom out" onClick={() => changeZoom(-1)}>−</Control>
              <Control label="Reset map" onClick={() => updateViewport(fitViewport(mapCoordinates))}>↺</Control>
            </div>
            <div className="absolute left-3 top-3 z-40 max-w-[calc(100%-5rem)] rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate shadow-sm">
              Drag to move · wheel stays on map to zoom
            </div>
            <div className="absolute bottom-3 left-3 right-3 z-40 flex gap-3 overflow-x-auto rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate shadow-sm">
              <span className="min-w-max">● Planning</span><span className="min-w-max text-signal-orange">T Tender</span><span className="min-w-max text-signal-orange">P Pipeline</span><span className="min-w-max text-charcoal">A Award</span><span className="min-w-max">C Commercial</span><span className="min-w-max text-slate/70">Dashed = regional · © OpenStreetMap</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-light-grey bg-soft-surface p-5">
            {selectedSignal ? (
              <SignalPanel signal={selectedSignal} onFocus={focusSelection} />
            ) : selectedDistrict ? (
              <DistrictPanel point={selectedDistrict} sourceFilter={sourceFilter} onFocus={focusSelection} />
            ) : (
              <MapSummary sourceFilter={sourceFilter} count={sourceCounts[sourceFilter]} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function DistrictPanel({ point, sourceFilter, onFocus }: { point: OpportunityMapPoint; sourceFilter: SourceFilter; onFocus: () => void }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">{sourceFilter === "commercial_development" ? "Commercial build area" : "Selected district"}</p>
      <h3 className="mt-2 text-2xl font-bold text-charcoal">{point.postcode_district}</h3>
      <p className="mt-1 text-sm text-slate">{point.post_town || "Local area"} · {point.trade_name}</p>
      <dl className="mt-5 space-y-3 border-t border-light-grey pt-4">
        <Metric label="Opportunities" value={String(point.opportunity_count)} />
        <Metric label="Estimated trade value" value={formatGbp(point.estimated_trade_value_low, point.estimated_trade_value_high)} />
        <Metric label="Territory" value={point.territory_status === "available" ? "Available" : "Claimed"} />
        <Metric label="Monthly price" value={formatMonthlyGbp(point.monthly_price_pence)} />
      </dl>
      <button type="button" onClick={onFocus} className="mt-5 w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm font-semibold text-charcoal hover:border-signal-orange">Focus on {point.post_town || point.postcode_district}</button>
      <Link href={`/territories/${encodeURIComponent(point.postcode_district)}/${encodeURIComponent(point.trade_slug)}`} className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white">{point.territory_status === "available" ? "Check and claim territory" : "View territory"} →</Link>
      <div className="mt-4">
        <LockedOpportunityPreview compact title="Add the district to My coverage to unlock the full brief" body="The project, status and indicative trade value are shown as a preview. Addresses and planning detail stay private until the territory is active." teaser={{ projectType: point.teaser_project_type, status: point.teaser_status, estimatedTradeValueLow: point.teaser_estimated_trade_value_low, estimatedTradeValueHigh: point.teaser_estimated_trade_value_high }} />
      </div>
    </>
  );
}

function SignalPanel({ signal, onFocus }: { signal: MarketSignalMapPoint; onFocus: () => void }) {
  const full = signal.access_level === "full";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">{sourceLabel(signal.signal_type)}</span>
        {signal.location_scope === "regional" && <span className="rounded-full border border-dashed border-charcoal/30 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-charcoal">Regional</span>}
        {full && <span className="rounded-full bg-charcoal px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">In your coverage</span>}
      </div>
      <h3 className="mt-3 text-lg font-bold leading-6 text-charcoal">{signal.title}</h3>
      <p className="mt-2 text-sm text-slate">{signal.location_label} · {signal.trade_name}</p>
      {signal.location_scope === "regional" && <p className="mt-3 rounded-xl border border-dashed border-light-grey bg-white px-3 py-2.5 text-xs leading-5 text-slate">This notice names a delivery region, not a single site. The marker is deliberately approximate.</p>}
      <dl className="mt-5 space-y-3 border-t border-light-grey pt-4">
        <Metric label="Est. trade value" value={formatGbp(signal.estimated_trade_value_low, signal.estimated_trade_value_high)} />
        <Metric label="Fit score" value={signal.fit_score === null ? "—" : `${Math.round(signal.fit_score)}/100`} />
        <Metric label="Deadline" value={signal.deadline_at ? new Date(signal.deadline_at).toLocaleDateString("en-GB") : "Not stated"} />
        {signal.buyer_name && <Metric label="Buyer" value={signal.buyer_name} />}
      </dl>
      <button type="button" onClick={onFocus} className="mt-5 w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm font-semibold text-charcoal hover:border-signal-orange">Focus on map</button>
      {full ? (
        <Link href={`/opportunities/trade/${encodeURIComponent(signal.market_signal_trade_match_id)}`} className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white">Open full opportunity →</Link>
      ) : signal.postcode_district ? (
        <Link href={`/territories/${encodeURIComponent(signal.postcode_district)}/${encodeURIComponent(signal.trade_slug)}`} className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-charcoal px-4 py-3 text-sm font-semibold text-white">Unlock {signal.postcode_district} for {signal.trade_name} →</Link>
      ) : (
        <Link href="/territories" className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-charcoal px-4 py-3 text-sm font-semibold text-white">Explore matching territory coverage →</Link>
      )}
      {!full && <p className="mt-3 text-xs leading-5 text-slate">The map shows the public work signal as a teaser. Buyer/contact and the full action brief unlock when your trade coverage qualifies.</p>}
    </>
  );
}

function MapSummary({ sourceFilter, count }: { sourceFilter: SourceFilter; count: number }) {
  return (
    <div className="flex min-h-[250px] flex-col justify-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-lg font-bold text-signal-orange">⌖</div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">{sourceLabel(sourceFilter)}</p>
      <h3 className="mt-2 text-xl font-bold text-charcoal">{count} mapped signal{count === 1 ? "" : "s"} in this trade view</h3>
      <p className="mt-2 text-sm leading-6 text-slate">Select a district bubble or a T, P, A or C marker to inspect the opportunity. Use the layer chips above the map when you only want one kind of work.</p>
    </div>
  );
}

function clusterPoints(points: OpportunityMapPoint[], zoom: number): Cluster[] {
  if (zoom >= CLUSTER_UNTIL_ZOOM) return points.map((point) => ({ key: planningKey(point), latitude: point.latitude, longitude: point.longitude, points: [point], opportunityCount: point.opportunity_count }));
  const groups = new Map<string, OpportunityMapPoint[]>();
  for (const point of points) {
    const pixel = project(point.latitude, point.longitude, zoom);
    const key = `${Math.floor(pixel.x / CLUSTER_GRID_PX)}:${Math.floor(pixel.y / CLUSTER_GRID_PX)}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({ key: `cluster:${key}`, latitude: group.reduce((sum, point) => sum + point.latitude, 0) / group.length, longitude: group.reduce((sum, point) => sum + point.longitude, 0) / group.length, points: group, opportunityCount: group.reduce((sum, point) => sum + point.opportunity_count, 0) }));
}

function buildSignalOffsets(signals: MarketSignalMapPoint[]) {
  const groups = new Map<string, MarketSignalMapPoint[]>();
  for (const signal of signals) {
    const key = `${signal.latitude.toFixed(4)}:${signal.longitude.toFixed(4)}`;
    const group = groups.get(key) ?? [];
    group.push(signal);
    groups.set(key, group);
  }
  const offsets = new Map<string, { x: number; y: number }>();
  for (const group of groups.values()) {
    if (group.length === 1) { offsets.set(group[0].market_signal_trade_match_id, { x: 0, y: 0 }); continue; }
    group.forEach((signal, index) => {
      const angle = (Math.PI * 2 * index) / group.length;
      const radius = Math.min(28, 12 + group.length * 2);
      offsets.set(signal.market_signal_trade_match_id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    });
  }
  return offsets;
}

function signalVisual(type: string, scope: "exact" | "regional") {
  const shape = scope === "regional" ? "rounded-full border-dashed" : "rounded-xl";
  if (type === "tender") return `${shape} border-signal-orange bg-signal-orange text-white`;
  if (type === "public_pipeline") return `${shape} border-signal-orange bg-white text-signal-orange`;
  if (type === "contract_award") return `${shape} border-charcoal bg-charcoal text-white`;
  return `${shape} border-slate bg-slate text-white`;
}

function sourceIcon(type: string) {
  if (type === "tender") return "T";
  if (type === "public_pipeline") return "P";
  if (type === "contract_award") return "A";
  if (type === "commercial_development") return "C";
  return "•";
}

function sourceLabel(type: string) {
  if (!type) return "All work";
  if (type === "planning") return "Planning";
  if (type === "tender") return "Tenders";
  if (type === "public_pipeline") return "Public pipeline";
  if (type === "contract_award") return "Awards";
  if (type === "commercial_development") return "Commercial builds";
  return "Opportunity";
}

function planningKey(point: OpportunityMapPoint) { return `${point.postcode_district}:${point.trade_slug}`; }

function Control({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} onPointerDown={(event) => event.stopPropagation()} onClick={onClick} className="flex h-9 w-9 items-center justify-center border-b border-light-grey text-lg font-semibold text-charcoal last:border-b-0 hover:bg-soft-surface">{children}</button>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 text-sm"><dt className="shrink-0 text-slate">{label}</dt><dd className="min-w-0 break-words text-right font-semibold text-charcoal">{value}</dd></div>;
}

function fitViewport(points: MapCoordinate[]): MapViewport {
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
  return { latitude: clamp(viewport.latitude, UK_BOUNDS.minLatitude, UK_BOUNDS.maxLatitude), longitude: clamp(viewport.longitude, UK_BOUNDS.minLongitude, UK_BOUNDS.maxLongitude), zoom: clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) };
}

function project(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const safe = clamp(latitude, -85.05112878, 85.05112878);
  const sine = Math.sin((safe * Math.PI) / 180);
  return { x: ((longitude + 180) / 360) * scale, y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return { latitude: (180 / Math.PI) * Math.atan(Math.sinh(n)), longitude };
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

function formatMonthlyGbp(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pence / 100);
}

function formatGbp(low: number | null | undefined, high?: number | null) {
  if (low == null && high == null) return "Value not stated";
  const formatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  if (low != null && high != null) return `${formatter.format(low)}–${formatter.format(high)}`;
  return formatter.format(high ?? low ?? 0);
}
