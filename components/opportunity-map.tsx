"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { formatGbpRange } from "@/components/opportunity-badge";
import { LeadUnlockButton } from "@/components/marketplace/lead-unlock-button";
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
  teaser_opportunity_id?: string | null;
  teaser_summary?: string | null;
  teaser_score?: number | null;
  teaser_needs?: string[];
  teaser_source?: string | null;
};

type MapItem = {
  id: string;
  kind: "planning" | "signal";
  latitude: number;
  longitude: number;
  category: string;
  typeLabel: string;
  title: string;
  location: string;
  score: number | null;
  valueLow: number | null;
  valueHigh: number | null;
  accessLevel: "full" | "teaser";
  planning?: OpportunityMapPoint;
  signal?: MarketSignalMapPoint;
};

type OpportunityCluster = {
  id: string;
  latitude: number;
  longitude: number;
  items: MapItem[];
  categories: Array<{ label: string; count: number }>;
};

type Selection =
  | { kind: "cluster"; ids: string[]; latitude: number; longitude: number }
  | { kind: "item"; id: string }
  | null;

// Keep the canvas centred on the real operating geography. The previous
// world-sized bounds forced a handful of low-resolution tiles to cover a very
// large area, which is what made drill-down look like a blurred screenshot.
const UK_BOUNDS = { west: -10, east: 4, north: 61.7, south: 49 };
const MAP_TILE_SIZE = 256;
const MAP_MIN_ZOOM = 0.55;
const MAP_MAX_ZOOM = 3.2;
const INITIAL_CAMERA = { latitude: 54.95, longitude: -2.2, zoom: 0.8 };

type MapCamera = typeof INITIAL_CAMERA;
type MapViewportSize = { width: number; height: number };

export function OpportunityMap({ points, signals }: { points: OpportunityMapPoint[]; signals: MarketSignalMapPoint[]; trades?: unknown[] }) {
  const [selection, setSelection] = useState<Selection>(null);
  const [scopeHistory, setScopeHistory] = useState<string[][]>([]);
  const [camera, setCamera] = useState<MapCamera>(INITIAL_CAMERA);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<MapViewportSize>({ width: 0, height: 0 });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; camera: MapCamera } | null>(null);
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const zoom = camera.zoom;

  const allItems = useMemo(() => toMapItems(points, signals), [points, signals]);
  const activeScopeIds = scopeHistory.at(-1) ?? null;
  const scopedItems = activeScopeIds ? allItems.filter((item) => activeScopeIds.includes(item.id)) : allItems;
  const visibleItems = activeScopeIds && scopedItems.length === 0 ? allItems : scopedItems;
  const clusters = useMemo(() => clusterItems(visibleItems, zoom), [visibleItems, zoom]);
  const selectedItem = selection?.kind === "item" ? allItems.find((item) => item.id === selection.id) ?? null : null;
  const selectedClusterItems = selection?.kind === "cluster"
    ? selection.ids.map((id) => allItems.find((item) => item.id === id)).filter((item): item is MapItem => Boolean(item))
    : [];
  const visibleCategories = useMemo(() => categoryCounts(visibleItems), [visibleItems]);

  function changeZoom(nextZoom: number, focalPoint?: { x: number; y: number }) {
    const clampedZoom = clamp(nextZoom, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
    const viewport = mapViewportRef.current;
    if (viewport && focalPoint && viewportSize.width > 0 && viewportSize.height > 0) {
      setCamera((current) => zoomAroundPoint(current, clampedZoom, focalPoint));
      return;
    }
    setCamera((current) => ({ ...current, zoom: clampedZoom }));
  }

  function focusMap(latitude: number, longitude: number, nextZoom: number) {
    setCamera({ latitude, longitude, zoom: clamp(nextZoom, MAP_MIN_ZOOM, MAP_MAX_ZOOM) });
  }

  function handleClusterClick(cluster: OpportunityCluster) {
    if (cluster.items.length === 1) {
      const item = cluster.items[0];
      setSelection({ kind: "item", id: item.id });
      // Individual markers still receive a camera move. This makes the final
      // drill-down predictable and prevents a selected marker being hidden
      // under a neighbouring point at the edge of a cluster.
      focusMap(item.latitude, item.longitude, Math.max(zoom, 2.8));
      return;
    }
    const ids = cluster.items.map((item) => item.id);
    setSelection({ kind: "cluster", ids, latitude: cluster.latitude, longitude: cluster.longitude });
    if (cluster.items.length < visibleItems.length) {
      setScopeHistory((history) => [...history, ids]);
    }
    focusMap(cluster.latitude, cluster.longitude, nextDrillZoom(zoom));
  }

  function stepBack() {
    setScopeHistory((history) => history.slice(0, -1));
    setSelection(null);
    changeZoom(zoom - 0.45);
  }

  function resetMap() {
    setCamera(INITIAL_CAMERA);
    setSelection(null);
    setScopeHistory([]);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, camera };
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const tileZoom = tileZoomForZoom(drag.camera.zoom);
    const scale = tileScaleForZoom(drag.camera.zoom, tileZoom);
    const startX = worldPixelX(drag.camera.longitude, tileZoom);
    const startY = worldPixelY(drag.camera.latitude, tileZoom);
    const longitude = inverseWorldPixelX(startX - (event.clientX - drag.startX) / scale, tileZoom);
    const latitude = inverseWorldPixelY(startY - (event.clientY - drag.startY) / scale, tileZoom);
    setCamera({ ...drag.camera, latitude, longitude });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);
  }

  useEffect(() => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = viewport.getBoundingClientRect();
      const focalPoint = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
      const nextZoom = clamp(zoom + (event.deltaY < 0 ? 0.12 : -0.12), MAP_MIN_ZOOM, MAP_MAX_ZOOM);
      setCamera((current) => zoomAroundPoint(current, nextZoom, focalPoint));
    };
    viewport.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleNativeWheel);
  }, [zoom]);

  useEffect(() => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    const updateSize = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-light-grey bg-white p-4 sm:p-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity map</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Explore the same Marketplace, geographically.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Clusters contain the exact opportunities available in Cards. Select a cluster to focus and split it, then select an individual marker to inspect its teaser without leaving the map.</p>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.45fr)]">
        <div ref={mapViewportRef} className="relative min-h-[430px] min-w-0 overflow-hidden overscroll-contain rounded-2xl border border-[#cbd9de] bg-[#e8f0f2] sm:min-h-[560px]" role="region" aria-label="Interactive opportunity exploration map">
          <div
            className={"absolute inset-0 select-none touch-none " + (isDragging ? "cursor-grabbing" : "cursor-grab")}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-label="Interactive opportunity map of the United Kingdom"
          >
            <MapTileLayer camera={camera} viewport={viewportSize} isDragging={isDragging} />

            <div className="absolute inset-0">
            {clusters.map((cluster) => {
              const isIndividual = cluster.items.length === 1;
              const topCategory = cluster.categories[0];
              const extraCategories = Math.max(0, cluster.categories.length - 1);
              const selected = selection?.kind === "item"
                ? cluster.items.some((item) => item.id === selection.id)
                : selection?.kind === "cluster" && cluster.items.some((item) => selection.ids.includes(item.id));
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => handleClusterClick(cluster)}
                  className={"absolute z-20 -translate-x-1/2 -translate-y-1/2 border-2 border-white text-white shadow-lg transition hover:z-30 hover:scale-110 " + (!isDragging ? "duration-300 ease-out " : "") + markerTone(cluster) + " " + (isIndividual ? "flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-black " : "flex max-w-[150px] items-center gap-1.5 rounded-full px-2.5 py-2 text-[10px] font-bold ") + (selected ? "ring-4 ring-signal-orange/30" : "")}
                  style={positionStyle(cluster.latitude, cluster.longitude, camera, viewportSize)}
                  aria-label={isIndividual ? "View " + cluster.items[0].title : cluster.items.length + " opportunities: " + cluster.categories.map((item) => item.label + " " + item.count).join(", ")}
                  title={cluster.categories.map((item) => item.label + " · " + item.count).join("\n")}
                >
                  {isIndividual
                    ? categoryCode(cluster.items[0])
                    : <><span className="max-w-[82px] truncate">{compactCategory(topCategory.label)}</span>{extraCategories > 0 && <span className="text-white/65">+{extraCategories}</span>}<span className="rounded-full bg-white/20 px-1.5 py-0.5">{cluster.items.length}</span></>}
                </button>
              );
            })}
            </div>
          </div>

          <div className="absolute left-3 top-3 z-40 flex items-center gap-2">
            <span className="rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate shadow-sm">Level {drillLevel(zoom)} · {visibleItems.length} opportunities</span>
            {scopeHistory.length > 0 && <button type="button" onClick={stepBack} className="rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-white">← Back</button>}
          </div>

          <div className="absolute right-3 top-3 z-40 flex overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-lg">
            <button type="button" onClick={() => changeZoom(zoom + 0.18)} className="h-9 w-9 text-lg font-semibold text-charcoal hover:bg-soft-surface" aria-label="Zoom in">+</button>
            <button type="button" onClick={() => changeZoom(zoom - 0.18)} className="h-9 w-9 border-l border-light-grey text-lg font-semibold text-charcoal hover:bg-soft-surface" aria-label="Zoom out">−</button>
            <button type="button" onClick={resetMap} className="h-9 w-9 border-l border-light-grey text-xs font-semibold text-charcoal hover:bg-soft-surface" aria-label="Reset map">↺</button>
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-40 flex gap-3 overflow-x-auto rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate shadow-sm">
            <span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-signal-orange" />Business-change</span>
            <span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-charcoal" />Public/commercial</span>
            <span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#475569]" />Mixed cluster</span>
            <span className="min-w-max text-slate/70">Select clusters to drill down · drag or scroll to explore · approximate markers</span>
          </div>
        </div>

        <aside className="min-w-0 self-start rounded-2xl border border-light-grey bg-soft-surface p-5 lg:sticky lg:top-6">
          {selectedItem
            ? <MapItemPanel item={selectedItem} />
            : selectedClusterItems.length > 1
              ? <ClusterPanel items={selectedClusterItems} onSelect={(id) => setSelection({ kind: "item", id })} />
              : <MapSummary total={allItems.length} visible={visibleItems.length} categories={visibleCategories} clusters={clusters.length} zoom={zoom} />}
        </aside>
      </div>
    </section>
  );
}

function MapTileLayer({ camera, viewport, isDragging }: { camera: MapCamera; viewport: MapViewportSize; isDragging: boolean }) {
  const tiles = useMemo(() => buildMapTiles(camera, viewport), [camera, viewport]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#dbe7e7]" aria-hidden="true">
      {tiles.map((tile) => {
        // OSM tiles are dynamic external imagery and must remain unoptimized.
        // eslint-disable-next-line @next/next/no-img-element
        return <img
          key={tile.key}
          src={tile.src}
          alt=""
          draggable={false}
          loading="eager"
          className={"pointer-events-none absolute max-w-none select-none " + (!isDragging ? "transition-[left,top,width,height] duration-300 ease-out" : "")}
          style={{ left: tile.left + "px", top: tile.top + "px", width: tile.width + "px", height: tile.height + "px" }}
        />;
      })}
      <div className="pointer-events-none absolute inset-0 bg-white/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0,rgba(232,240,242,0.04)_55%,rgba(31,41,55,0.12)_100%)]" />
      <div className="pointer-events-none absolute bottom-1 left-2 rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-slate/80 shadow-sm">© OpenStreetMap contributors</div>
    </div>
  );
}

function ClusterPanel({ items, onSelect }: { items: MapItem[]; onSelect: (id: string) => void }) {
  const categories = categoryCounts(items);
  return <>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Focused cluster</p>
    <h3 className="mt-2 text-2xl font-bold text-charcoal">{items.length} opportunities in this group</h3>
    <p className="mt-2 text-sm leading-6 text-slate">The map has focused on this group and split it into smaller spatial clusters. Continue selecting markers, or open an opportunity directly below.</p>
    <div className="mt-4 flex flex-wrap gap-1.5">{categories.slice(0, 6).map((category) => <span key={category.label} className="rounded-full border border-light-grey bg-white px-2.5 py-1 text-[10px] font-semibold text-slate">{category.label} · {category.count}</span>)}</div>
    <div className="mt-5 space-y-2 border-t border-light-grey pt-4">
      {items.slice(0, 6).map((item) => <button type="button" onClick={() => onSelect(item.id)} key={item.id} className="block w-full rounded-xl border border-transparent bg-white p-3 text-left transition hover:border-signal-orange/30"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold leading-5 text-charcoal">{item.title}</p><span className="shrink-0 rounded-full bg-soft-surface px-2 py-1 text-[9px] font-bold text-slate">{categoryCode(item)}</span></div><p className="mt-1 text-[11px] text-slate">{item.location} · {item.category}</p><span className="mt-2 inline-flex text-[11px] font-semibold text-signal-orange">View teaser →</span></button>)}
      {items.length > 6 && <p className="px-2 pt-1 text-[11px] text-slate">Continue drilling down on the map to separate the remaining {items.length - 6} opportunities.</p>}
    </div>
  </>;
}

function MapItemPanel({ item }: { item: MapItem }) {
  if (item.kind === "planning" && item.planning) return <OpportunityPanel point={item.planning} />;
  if (item.signal) return <SignalPanel signal={item.signal} />;
  return null;
}

function OpportunityPanel({ point }: { point: OpportunityMapPoint }) {
  const needs = point.teaser_needs?.filter(Boolean).slice(0, 5) ?? [];
  return <>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">Opportunity teaser</span>{point.teaser_status && <span className="rounded-full border border-light-grey bg-white px-2.5 py-1 text-[10px] font-semibold text-slate">{humanize(point.teaser_status)}</span>}</div>
    <h3 className="mt-3 text-xl font-bold leading-tight text-charcoal">{point.teaser_project_type ?? "Buying-window opportunity"}</h3>
    <p className="mt-2 text-sm leading-6 text-slate">{point.post_town || point.postcode_district} · {point.postcode_district} · approximate area</p>
    {point.teaser_summary && <div className="mt-4 rounded-2xl border border-signal-orange/15 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">Why now</p><p className="mt-2 text-xs leading-5 text-slate">{point.teaser_summary}</p></div>}
    <dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Customer fit" value={point.teaser_score == null ? "Under review" : Math.round(point.teaser_score) + "/100"} /><Metric label="Indicative value" value={formatGbpRange(point.teaser_estimated_trade_value_low ?? null, point.teaser_estimated_trade_value_high ?? null)} /><Metric label="Source" value={humanize(point.teaser_source ?? "Unified intelligence")} /></dl>
    {needs.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{needs.map((need) => <span key={need} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate">{need}</span>)}</div>}
    {point.teaser_opportunity_id && <div className="mt-5"><LeadUnlockButton opportunityId={point.teaser_opportunity_id} /></div>}
  </>;
}

function SignalPanel({ signal }: { signal: MarketSignalMapPoint }) {
  return <>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">{humanize(signal.signal_type)}</span>{signal.location_scope === "regional" && <span className="rounded-full border border-dashed border-charcoal/30 px-2.5 py-1 text-[10px] font-semibold text-slate">Regional marker</span>}</div>
    <h3 className="mt-3 text-xl font-bold leading-tight text-charcoal">{signal.title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate">{signal.location_label}{signal.buyer_name ? " · " + signal.buyer_name : ""}</p>
    <dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Customer fit" value={signal.fit_score == null ? "Under review" : Math.round(signal.fit_score) + "/100"} /><Metric label="Indicative value" value={formatGbpRange(signal.estimated_trade_value_low, signal.estimated_trade_value_high)} /><Metric label="Access" value={signal.access_level === "full" ? "Purchased lead" : "Opportunity teaser"} /></dl>
    <div className="mt-5">{signal.access_level === "full" ? <Link href={"/opportunities/trade/" + encodeURIComponent(signal.market_signal_trade_match_id)} className="inline-flex w-full items-center justify-center rounded-xl bg-charcoal px-4 py-3 text-sm font-semibold text-white">Open full brief →</Link> : <LeadUnlockButton marketSignalId={signal.market_signal_trade_match_id} />}</div>
  </>;
}

function MapSummary({ total, visible, categories, clusters, zoom }: { total: number; visible: number; categories: Array<{ label: string; count: number }>; clusters: number; zoom: number }) {
  return <>
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-lg text-signal-orange">⌖</div>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Marketplace map</p>
    <h3 className="mt-2 text-2xl font-bold text-charcoal">{visible.toLocaleString("en-GB")} opportunities visible</h3>
    <p className="mt-2 text-sm leading-6 text-slate">{visible === total ? "This is the same filtered set shown in Cards." : "You are inside a focused geographic group from the filtered Marketplace."} Select a cluster to focus the map and break it into smaller groups.</p>
    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-light-grey pt-4"><Metric label="Map groups" value={String(clusters)} /><Metric label="Drill level" value={String(drillLevel(zoom))} /></dl>
    <div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate">Leading categories</p><div className="mt-2 flex flex-wrap gap-1.5">{categories.slice(0, 6).map((category) => <span key={category.label} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate">{category.label} · {category.count}</span>)}</div></div>
    <p className="mt-5 rounded-xl border border-light-grey bg-white px-3 py-3 text-xs leading-5 text-slate">Cluster → smaller cluster/category → individual opportunity → teaser. Purchased and unavailable opportunities follow the same visibility rules as Cards.</p>
  </>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">{label}</dt><dd className="mt-1 text-sm font-semibold text-charcoal">{value}</dd></div>;
}

function toMapItems(points: OpportunityMapPoint[], signals: MarketSignalMapPoint[]): MapItem[] {
  const planningItems: MapItem[] = points.flatMap((point, index) => {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return [];
    const category = point.teaser_needs?.find(Boolean) ?? humanize(point.teaser_source ?? "Business change");
    return [{
      id: "planning:" + (point.teaser_opportunity_id ?? point.postcode_district + ":" + index),
      kind: "planning",
      latitude: point.latitude,
      longitude: point.longitude,
      category,
      typeLabel: humanize(point.teaser_source ?? "Business change"),
      title: point.teaser_project_type ?? "Buying-window opportunity",
      location: point.post_town || point.postcode_district,
      score: point.teaser_score ?? null,
      valueLow: point.teaser_estimated_trade_value_low ?? null,
      valueHigh: point.teaser_estimated_trade_value_high ?? null,
      accessLevel: "teaser",
      planning: point,
    }];
  });
  const signalItems: MapItem[] = signals.flatMap((signal) => {
    if (!Number.isFinite(signal.latitude) || !Number.isFinite(signal.longitude)) return [];
    const tradeName = signal.trade_name && signal.trade_name !== "Trade" ? signal.trade_name : null;
    return [{
      id: "signal:" + signal.market_signal_trade_match_id,
      kind: "signal",
      latitude: signal.latitude,
      longitude: signal.longitude,
      category: tradeName ?? humanize(signal.signal_type),
      typeLabel: humanize(signal.signal_type),
      title: signal.title,
      location: signal.location_label,
      score: signal.fit_score,
      valueLow: signal.estimated_trade_value_low,
      valueHigh: signal.estimated_trade_value_high,
      accessLevel: signal.access_level,
      signal,
    }];
  });
  return [...planningItems, ...signalItems];
}

function clusterItems(items: MapItem[], zoom: number): OpportunityCluster[] {
  if (zoom >= 2.75) {
    // At the final level, cluster only markers that would still collide on
    // screen. This keeps real coordinates intact while avoiding a stack of
    // unreadable buttons for regional or same-district signals.
    return clusterNearbyItems(items, zoom);
  }

  const cell = clusterCell(zoom);
  const grouped = new Map<string, MapItem[]>();
  for (const item of items) {
    const latitudeCell = Math.floor((item.latitude - UK_BOUNDS.south) / cell.latitude);
    const longitudeCell = Math.floor((item.longitude - UK_BOUNDS.west) / cell.longitude);
    const key = cell.tier + ":" + latitudeCell + ":" + longitudeCell;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return [...grouped.entries()].map(([key, groupedItems]) => ({
    id: "cluster:" + key,
    latitude: groupedItems.reduce((sum, item) => sum + item.latitude, 0) / groupedItems.length,
    longitude: groupedItems.reduce((sum, item) => sum + item.longitude, 0) / groupedItems.length,
    items: [...groupedItems].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0)),
    categories: categoryCounts(groupedItems),
  })).sort((a, b) => b.items.length - a.items.length);
}

function clusterNearbyItems(items: MapItem[], zoom: number): OpportunityCluster[] {
  const tileZoom = tileZoomForZoom(zoom);
  const scale = tileScaleForZoom(zoom, tileZoom);
  const radius = 42 / scale;
  const groups: Array<{ items: MapItem[]; x: number; y: number }> = [];
  const buckets = new Map<string, number[]>();

  for (const item of items) {
    const x = worldPixelX(item.longitude, tileZoom);
    const y = worldPixelY(item.latitude, tileZoom);
    const bucketX = Math.floor(x / radius);
    const bucketY = Math.floor(y / radius);
    const candidates = new Set<number>();
    for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        for (const groupIndex of buckets.get((bucketX + xOffset) + ":" + (bucketY + yOffset)) ?? []) candidates.add(groupIndex);
      }
    }
    const nearbyIndex = [...candidates].find((groupIndex) => Math.hypot(groups[groupIndex].x - x, groups[groupIndex].y - y) <= radius);
    if (nearbyIndex !== undefined) {
      const nearby = groups[nearbyIndex];
      nearby.items.push(item);
      nearby.x = nearby.items.reduce((sum, current) => sum + worldPixelX(current.longitude, tileZoom), 0) / nearby.items.length;
      nearby.y = nearby.items.reduce((sum, current) => sum + worldPixelY(current.latitude, tileZoom), 0) / nearby.items.length;
      const groupBucket = bucketX + ":" + bucketY;
      buckets.set(groupBucket, [...(buckets.get(groupBucket) ?? []), nearbyIndex]);
    } else {
      const groupIndex = groups.length;
      groups.push({ items: [item], x, y });
      const groupBucket = bucketX + ":" + bucketY;
      buckets.set(groupBucket, [...(buckets.get(groupBucket) ?? []), groupIndex]);
    }
  }

  return groups.map((group, index) => {
    const sortedItems = [...group.items].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
    return {
      id: "item-group:" + index + ":" + sortedItems.map((item) => item.id).join(","),
      latitude: sortedItems.reduce((sum, item) => sum + item.latitude, 0) / sortedItems.length,
      longitude: sortedItems.reduce((sum, item) => sum + item.longitude, 0) / sortedItems.length,
      items: sortedItems,
      categories: categoryCounts(sortedItems),
    };
  }).sort((a, b) => b.items.length - a.items.length);
}

function clusterCell(zoom: number) {
  if (zoom < 0.9) return { latitude: 2.4, longitude: 3.0, tier: "country" };
  if (zoom < 1.35) return { latitude: 1.15, longitude: 1.45, tier: "region" };
  if (zoom < 1.8) return { latitude: 0.55, longitude: 0.7, tier: "area" };
  if (zoom < 2.3) return { latitude: 0.24, longitude: 0.32, tier: "local" };
  return { latitude: 0.1, longitude: 0.14, tier: "district" };
}

function categoryCounts(items: MapItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function nextDrillZoom(zoom: number) {
  const levels = [0.95, 1.4, 1.85, 2.35, 2.8, 3.2];
  return levels.find((level) => level > zoom + 0.04) ?? 3.2;
}

function drillLevel(zoom: number) {
  if (zoom < 0.9) return 1;
  if (zoom < 1.35) return 2;
  if (zoom < 1.8) return 3;
  if (zoom < 2.3) return 4;
  if (zoom < 2.75) return 5;
  return 6;
}

function markerTone(cluster: OpportunityCluster) {
  const planning = cluster.items.every((item) => item.kind === "planning");
  const signals = cluster.items.every((item) => item.kind === "signal");
  if (planning) return "bg-signal-orange";
  if (signals) return "bg-charcoal";
  return "bg-[#475569]";
}

function categoryCode(item: MapItem) {
  if (item.kind === "signal") {
    if (item.signal?.signal_type === "tender") return "T";
    if (item.signal?.signal_type === "contract_award") return "A";
    if (item.signal?.signal_type === "public_pipeline") return "P";
  }
  const words = item.category.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "•";
}

function compactCategory(value: string) {
  const clean = value.trim();
  return clean.length > 15 ? clean.slice(0, 14) + "…" : clean;
}

type MapTile = { key: string; src: string; left: number; top: number; width: number; height: number };

function buildMapTiles(camera: MapCamera, viewport: MapViewportSize): MapTile[] {
  const width = viewport.width || 1000;
  const height = viewport.height || 560;
  const tileZoom = tileZoomForZoom(camera.zoom);
  const scale = tileScaleForZoom(camera.zoom, tileZoom);
  const centerX = worldPixelX(camera.longitude, tileZoom);
  const centerY = worldPixelY(camera.latitude, tileZoom);
  const visibleWorldWidth = width / scale;
  const visibleWorldHeight = height / scale;
  const minTileX = Math.floor((centerX - visibleWorldWidth / 2) / MAP_TILE_SIZE) - 1;
  const maxTileX = Math.floor((centerX + visibleWorldWidth / 2) / MAP_TILE_SIZE) + 1;
  const minTileY = Math.floor((centerY - visibleWorldHeight / 2) / MAP_TILE_SIZE) - 1;
  const maxTileY = Math.floor((centerY + visibleWorldHeight / 2) / MAP_TILE_SIZE) + 1;
  const worldTileCount = 2 ** tileZoom;
  const tiles: MapTile[] = [];

  for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
    if (tileY < 0 || tileY >= worldTileCount) continue;
    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      const wrappedX = ((tileX % worldTileCount) + worldTileCount) % worldTileCount;
      tiles.push({
        key: tileZoom + ":" + tileX + ":" + tileY,
        src: "https://tile.openstreetmap.org/" + tileZoom + "/" + wrappedX + "/" + tileY + ".png",
        left: width / 2 + (tileX * MAP_TILE_SIZE - centerX) * scale,
        top: height / 2 + (tileY * MAP_TILE_SIZE - centerY) * scale,
        width: MAP_TILE_SIZE * scale,
        height: MAP_TILE_SIZE * scale,
      });
    }
  }
  return tiles;
}

function mapZoomForUiZoom(zoom: number) {
  return 7 + (zoom - 0.8) * 1.25;
}

function tileZoomForZoom(zoom: number) {
  return clamp(Math.round(mapZoomForUiZoom(zoom)), 5, 10);
}

function tileScaleForZoom(zoom: number, tileZoom = tileZoomForZoom(zoom)) {
  return 2 ** (mapZoomForUiZoom(zoom) - tileZoom);
}

function positionStyle(latitude: number, longitude: number, camera: MapCamera, viewport: MapViewportSize): CSSProperties {
  const width = viewport.width || 1000;
  const height = viewport.height || 560;
  const tileZoom = tileZoomForZoom(camera.zoom);
  const scale = tileScaleForZoom(camera.zoom, tileZoom);
  const centerX = worldPixelX(camera.longitude, tileZoom);
  const centerY = worldPixelY(camera.latitude, tileZoom);
  return {
    left: width / 2 + (worldPixelX(longitude, tileZoom) - centerX) * scale,
    top: height / 2 + (worldPixelY(latitude, tileZoom) - centerY) * scale,
  };
}

function zoomAroundPoint(camera: MapCamera, nextZoom: number, focalPoint: { x: number; y: number }): MapCamera {
  const oldTileZoom = tileZoomForZoom(camera.zoom);
  const oldScale = tileScaleForZoom(camera.zoom, oldTileZoom);
  const oldCenterX = worldPixelX(camera.longitude, oldTileZoom);
  const oldCenterY = worldPixelY(camera.latitude, oldTileZoom);
  const pointLongitude = inverseWorldPixelX(oldCenterX + focalPoint.x / oldScale, oldTileZoom);
  const pointLatitude = inverseWorldPixelY(oldCenterY + focalPoint.y / oldScale, oldTileZoom);
  const nextTileZoom = tileZoomForZoom(nextZoom);
  const nextScale = tileScaleForZoom(nextZoom, nextTileZoom);
  const nextPointX = worldPixelX(pointLongitude, nextTileZoom);
  const nextPointY = worldPixelY(pointLatitude, nextTileZoom);
  return {
    longitude: inverseWorldPixelX(nextPointX - focalPoint.x / nextScale, nextTileZoom),
    latitude: inverseWorldPixelY(nextPointY - focalPoint.y / nextScale, nextTileZoom),
    zoom: nextZoom,
  };
}

function worldPixelX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * MAP_TILE_SIZE * 2 ** zoom;
}

function worldPixelY(latitude: number, zoom: number) {
  const clampedLatitude = clamp(latitude, -85.05112878, 85.05112878);
  const radians = (clampedLatitude * Math.PI) / 180;
  const mercator = (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
  return mercator * MAP_TILE_SIZE * 2 ** zoom;
}

function inverseWorldPixelX(value: number, zoom: number) {
  const worldSize = MAP_TILE_SIZE * 2 ** zoom;
  const wrapped = ((value % worldSize) + worldSize) % worldSize;
  return (wrapped / worldSize) * 360 - 180;
}

function inverseWorldPixelY(value: number, zoom: number) {
  const worldSize = MAP_TILE_SIZE * 2 ** zoom;
  const normalized = clamp(value / worldSize, 0, 1);
  const mercator = Math.PI * (1 - 2 * normalized);
  return (Math.atan(Math.sinh(mercator)) * 180) / Math.PI;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
