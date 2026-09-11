"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { formatGbpRange } from "@/components/opportunity-badge";
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

type Layer = "all" | "planning" | "tender" | "public_pipeline" | "contract_award" | "commercial_development";
type Selection =
  | { kind: "district"; id: string }
  | { kind: "signal"; id: string }
  | { kind: "signal-cluster"; id: string }
  | null;

type DistrictCluster = OpportunityMapPoint & {
  sourceCount: number;
};

type SignalCluster = {
  id: string;
  latitude: number;
  longitude: number;
  signals: MarketSignalMapPoint[];
};

const LAYERS: Array<{ value: Layer; label: string }> = [
  { value: "all", label: "All signals" },
  { value: "planning", label: "Business change" },
  { value: "commercial_development", label: "Commercial change" },
  { value: "tender", label: "Tenders" },
  { value: "public_pipeline", label: "Public pipeline" },
  { value: "contract_award", label: "Awards" },
];

const MAP_TILES = [
  "https://tile.openstreetmap.org/5/14/9.png",
  "https://tile.openstreetmap.org/5/15/9.png",
  "https://tile.openstreetmap.org/5/16/9.png",
  "https://tile.openstreetmap.org/5/17/9.png",
  "https://tile.openstreetmap.org/5/14/10.png",
  "https://tile.openstreetmap.org/5/15/10.png",
  "https://tile.openstreetmap.org/5/16/10.png",
  "https://tile.openstreetmap.org/5/17/10.png",
];

// Four square tiles by two square tiles gives the basemap a stable 2:1
// aspect ratio. These are the exact geographic edges of z5/x14-17/y9-10.
const UK_BOUNDS = { west: -22.5, east: 22.5, north: 61.606396, south: 48.922499 };

export function OpportunityMap({ points, signals }: { points: OpportunityMapPoint[]; signals: MarketSignalMapPoint[]; trades?: unknown[] }) {
  const [layer, setLayer] = useState<Layer>("all");
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  function changeZoom(nextZoom: number) {
    setZoom(clamp(nextZoom, 0.8, 1.8));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setPan({
      x: clamp(drag.originX + event.clientX - drag.startX, -460, 460),
      y: clamp(drag.originY + event.clientY - drag.startY, -280, 280),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      dragRef.current = null;
      setIsDragging(false);
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
  }

  function resetMap() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  const filteredPoints = useMemo(() => {
    if (layer === "tender" || layer === "public_pipeline" || layer === "contract_award") return [];
    if (layer === "commercial_development") return points.filter((point) => Number(point.commercial_opportunity_count ?? 0) > 0);
    return points;
  }, [layer, points]);

  const filteredSignals = useMemo(() => {
    if (layer === "planning" || layer === "commercial_development") return [];
    return layer === "all" ? signals : signals.filter((signal) => signal.signal_type === layer);
  }, [layer, signals]);

  const districtClusters = useMemo(() => clusterPlanningPoints(filteredPoints), [filteredPoints]);
  const signalClusters = useMemo(() => clusterSignals(filteredSignals), [filteredSignals]);
  const selectedDistrict = selection?.kind === "district" ? districtClusters.find((point) => point.postcode_district === selection.id) ?? null : null;
  const selectedSignal = selection?.kind === "signal" ? filteredSignals.find((signal) => signal.market_signal_trade_match_id === selection.id) ?? null : null;
  const selectedSignalCluster = selection?.kind === "signal-cluster" ? signalClusters.find((cluster) => cluster.id === selection.id) ?? null : null;
  const mappedCount = filteredPoints.reduce((sum, point) => sum + Number(point.opportunity_count ?? 0), 0) + filteredSignals.length;

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-light-grey bg-white p-4 sm:p-7">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity map</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">See where buying windows are building.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Drag or scroll to explore concentration across the UK. Select a business-change area or public-signal cluster, then open the marketplace for the full teaser.</p>
        </div>
        <Link href="/opportunities" className="shrink-0 text-sm font-semibold text-signal-orange">Open marketplace →</Link>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {LAYERS.map((item) => (
          <button key={item.value} type="button" onClick={() => { setLayer(item.value); setSelection(null); }} className={`min-w-max rounded-xl border px-3 py-2 text-xs font-semibold transition ${layer === item.value ? "border-signal-orange bg-signal-orange text-white" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}>
            {item.label} <span className={layer === item.value ? "text-white/70" : "text-slate"}>{countForLayer(item.value, points, signals)}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.45fr)]">
        <div className="relative min-h-[430px] min-w-0 overflow-hidden rounded-2xl border border-[#cbd9de] bg-[#e8f0f2] sm:min-h-[560px]" role="region" aria-label="Interactive opportunity exploration map">
          <div
            className={`absolute inset-y-0 left-1/2 h-full w-auto select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ aspectRatio: "2 / 1", transform: `translate3d(calc(-50% + ${pan.x}px), ${pan.y}px, 0) scale(${zoom})`, transformOrigin: "center" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={handleWheel}
            aria-label="Approximate opportunity map of the United Kingdom"
          >
            <div className="absolute inset-0 overflow-hidden bg-[#dbe7e7]">
              <div className="grid h-full w-full grid-cols-4 grid-rows-2">
                {MAP_TILES.map((tile) => <div key={tile} aria-hidden="true" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${tile})` }} />)}
              </div>
              <div className="absolute inset-0 bg-white/10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0,rgba(232,240,242,0.04)_55%,rgba(31,41,55,0.12)_100%)]" />
            </div>

            {districtClusters.map((point) => (
              <button key={`district-${point.postcode_district}`} type="button" onClick={() => setSelection({ kind: "district", id: point.postcode_district })} className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-signal-orange px-2.5 py-2 text-xs font-bold text-white shadow-lg transition hover:scale-110 ${selectedDistrict?.postcode_district === point.postcode_district ? "ring-4 ring-signal-orange/30" : ""}`} style={positionStyle(point.latitude, point.longitude)} aria-label={`${point.opportunity_count} opportunities in ${point.post_town || point.postcode_district}`}>
                {point.opportunity_count}
              </button>
            ))}

            {signalClusters.map((cluster) => {
              const isCluster = cluster.signals.length > 1;
              const selected = selection?.kind === "signal-cluster" ? selection.id === cluster.id : selection?.kind === "signal" && cluster.signals.some((signal) => signal.market_signal_trade_match_id === selection.id);
              return (
                <button key={cluster.id} type="button" onClick={() => setSelection(isCluster ? { kind: "signal-cluster", id: cluster.id } : { kind: "signal", id: cluster.signals[0].market_signal_trade_match_id })} className={`absolute z-30 flex h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 border-white bg-charcoal px-2 text-[10px] font-black text-white shadow-lg transition hover:scale-110 ${selected ? "ring-4 ring-signal-orange/30" : ""}`} style={positionStyle(cluster.latitude, cluster.longitude)} aria-label={isCluster ? `${cluster.signals.length} public signals in this area` : `${cluster.signals[0].signal_type}: ${cluster.signals[0].title}`}>
                {isCluster ? cluster.signals.length : signalIcon(cluster.signals[0].signal_type)}
              </button>
            );
          })}
          </div>

          <div className="absolute right-3 top-3 z-40 flex overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-lg">
            <button type="button" onClick={() => changeZoom(zoom + 0.15)} className="h-9 w-9 text-lg font-semibold text-charcoal hover:bg-soft-surface" aria-label="Zoom in">+</button>
            <button type="button" onClick={() => changeZoom(zoom - 0.15)} className="h-9 w-9 border-l border-light-grey text-lg font-semibold text-charcoal hover:bg-soft-surface" aria-label="Zoom out">−</button>
            <button type="button" onClick={resetMap} className="h-9 w-9 border-l border-light-grey text-xs font-semibold text-charcoal hover:bg-soft-surface" aria-label="Reset map">↺</button>
          </div>
          <div className="absolute bottom-3 left-3 right-3 z-40 flex gap-3 overflow-x-auto rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate shadow-sm">
            <span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-signal-orange" />Business change</span>
            <span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded bg-charcoal" />Public signal</span>
            <span className="min-w-max text-slate/70">Drag to explore · scroll to zoom</span><span className="min-w-max text-slate/70">Approximate markers · © OpenStreetMap contributors</span>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-light-grey bg-soft-surface p-5">
          {selectedSignalCluster ? <SignalClusterPanel cluster={selectedSignalCluster} /> : selectedSignal ? <SignalPanel signal={selectedSignal} /> : selectedDistrict ? <DistrictPanel point={selectedDistrict} layer={layer} /> : <MapSummary count={mappedCount} layer={layer} areas={districtClusters.length} clusters={signalClusters.length} />}
        </div>
      </div>
    </section>
  );
}

function DistrictPanel({ point, layer }: { point: DistrictCluster; layer: Layer }) {
  const commercial = layer === "commercial_development";
  const count = commercial ? Number(point.commercial_opportunity_count ?? 0) : Number(point.opportunity_count ?? 0);
  const low = commercial ? Number(point.commercial_estimated_trade_value_low ?? 0) : point.estimated_trade_value_low;
  const high = commercial ? Number(point.commercial_estimated_trade_value_high ?? 0) : point.estimated_trade_value_high;
  return <>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Selected area</p>
    <h3 className="mt-2 text-2xl font-bold text-charcoal">{point.post_town || point.postcode_district}</h3>
    <p className="mt-1 text-sm text-slate">{point.postcode_district} · approximate opportunity density</p>
    <dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Open signals" value={String(count)} /><Metric label="Indicative value" value={formatGbpRange(low, high)} /><Metric label="Signal layer" value={commercial ? "Commercial change" : "Business change"} /><Metric label="Map marker" value="Approximate" /></dl>
    <p className="mt-5 rounded-xl border border-signal-orange/15 bg-white px-3 py-3 text-xs leading-5 text-slate">The map shows density. Open the marketplace to review relevant teasers and choose individual leads to unlock for £20.</p>
    <Link href="/opportunities?source=planning" className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white">Review area opportunities →</Link>
  </>;
}

function SignalPanel({ signal }: { signal: MarketSignalMapPoint }) {
  return <>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">{humanize(signal.signal_type)}</span>{signal.location_scope === "regional" && <span className="rounded-full border border-dashed border-charcoal/30 px-2.5 py-1 text-[10px] font-semibold text-slate">Regional marker</span>}</div>
    <h3 className="mt-3 text-xl font-bold leading-tight text-charcoal">{signal.title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate">{signal.location_label}{signal.buyer_name ? ` · ${signal.buyer_name}` : ""}</p>
    <dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Customer fit" value={signal.fit_score == null ? "Under review" : `${Math.round(signal.fit_score)}/100`} /><Metric label="Indicative value" value={formatGbpRange(signal.estimated_trade_value_low, signal.estimated_trade_value_high)} /><Metric label="Access" value="Marketplace teaser" /></dl>
    <Link href={`/opportunities?signal=${encodeURIComponent(signal.market_signal_trade_match_id)}`} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white">Review signal →</Link>
  </>;
}

function SignalClusterPanel({ cluster }: { cluster: SignalCluster }) {
  const topSignals = cluster.signals.slice(0, 3);
  return <>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Public signal cluster</p>
    <h3 className="mt-2 text-2xl font-bold text-charcoal">{cluster.signals.length} signals nearby</h3>
    <p className="mt-1 text-sm leading-6 text-slate">Grouped to keep the map readable. Select the marketplace to compare the individual teasers.</p>
    <div className="mt-5 space-y-3 border-t border-light-grey pt-4">{topSignals.map((signal) => <div key={signal.market_signal_trade_match_id} className="rounded-xl bg-white p-3"><p className="text-xs font-semibold text-charcoal">{signal.title}</p><p className="mt-1 text-[11px] text-slate">{signal.location_label} · {humanize(signal.signal_type)}</p></div>)}</div>
    <Link href="/opportunities?source=public" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white">Compare public signals →</Link>
  </>;
}

function MapSummary({ count, layer, areas, clusters }: { count: number; layer: Layer; areas: number; clusters: number }) {
  return <>
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-lg text-signal-orange">⌖</div>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">{layer === "all" ? "All intelligence" : humanize(layer)}</p>
    <h3 className="mt-2 text-2xl font-bold text-charcoal">{count.toLocaleString("en-GB")} mapped signals</h3>
    <p className="mt-2 text-sm leading-6 text-slate">Business-change areas are aggregated by postcode district. Public signals are grouped by proximity so you can inspect the pattern without losing the underlying opportunities.</p>
    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-light-grey pt-4"><Metric label="Business areas" value={String(areas)} /><Metric label="Public clusters" value={String(clusters)} /></div>
    <p className="mt-5 rounded-xl border border-light-grey bg-white px-3 py-3 text-xs leading-5 text-slate">Map markers are approximate discovery points. The marketplace contains the evidence summary, fit explanation and £20 unlock action.</p>
  </>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">{label}</dt><dd className="mt-1 text-sm font-semibold text-charcoal">{value}</dd></div>; }

function clusterPlanningPoints(points: OpportunityMapPoint[]): DistrictCluster[] {
  const grouped = new Map<string, DistrictCluster>();
  for (const point of points) {
    const existing = grouped.get(point.postcode_district);
    if (!existing) {
      grouped.set(point.postcode_district, { ...point, sourceCount: 1 });
      continue;
    }
    existing.opportunity_count += Number(point.opportunity_count ?? 0);
    existing.estimated_trade_value_low += Number(point.estimated_trade_value_low ?? 0);
    existing.estimated_trade_value_high += Number(point.estimated_trade_value_high ?? 0);
    existing.commercial_opportunity_count = Number(existing.commercial_opportunity_count ?? 0) + Number(point.commercial_opportunity_count ?? 0);
    existing.commercial_estimated_trade_value_low = Number(existing.commercial_estimated_trade_value_low ?? 0) + Number(point.commercial_estimated_trade_value_low ?? 0);
    existing.commercial_estimated_trade_value_high = Number(existing.commercial_estimated_trade_value_high ?? 0) + Number(point.commercial_estimated_trade_value_high ?? 0);
    existing.sourceCount += 1;
    if (Number(point.opportunity_count ?? 0) > Number(existing.opportunity_count ?? 0)) Object.assign(existing, point);
  }
  return [...grouped.values()].sort((a, b) => b.opportunity_count - a.opportunity_count);
}

function clusterSignals(signals: MarketSignalMapPoint[]): SignalCluster[] {
  const grouped = new Map<string, MarketSignalMapPoint[]>();
  for (const signal of signals) {
    const lat = Math.round(signal.latitude / 0.35);
    const lon = Math.round(signal.longitude / 0.45);
    const key = `${lat}:${lon}`;
    grouped.set(key, [...(grouped.get(key) ?? []), signal]);
  }
  return [...grouped.entries()].map(([key, items]) => ({
    id: `signal-cluster-${key}`,
    latitude: items.reduce((sum, item) => sum + item.latitude, 0) / items.length,
    longitude: items.reduce((sum, item) => sum + item.longitude, 0) / items.length,
    signals: [...items].sort((a, b) => Number(b.fit_score ?? 0) - Number(a.fit_score ?? 0)),
  })).sort((a, b) => b.signals.length - a.signals.length);
}

function positionStyle(latitude: number, longitude: number): CSSProperties {
  const x = ((longitude - UK_BOUNDS.west) / (UK_BOUNDS.east - UK_BOUNDS.west)) * 100;
  const y = ((UK_BOUNDS.north - latitude) / (UK_BOUNDS.north - UK_BOUNDS.south)) * 100;
  return { left: `${x}%`, top: `${y}%` };
}

function countForLayer(layer: Layer, points: OpportunityMapPoint[], signals: MarketSignalMapPoint[]) {
  if (layer === "planning") return points.reduce((sum, point) => sum + Number(point.opportunity_count ?? 0), 0);
  if (layer === "commercial_development") return points.reduce((sum, point) => sum + Number(point.commercial_opportunity_count ?? 0), 0);
  if (layer === "all") return points.reduce((sum, point) => sum + Number(point.opportunity_count ?? 0), 0) + signals.length;
  return signals.filter((signal) => signal.signal_type === layer).length;
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function humanize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function signalIcon(value: string) { if (value === "tender") return "T"; if (value === "contract_award") return "A"; if (value === "public_pipeline") return "P"; return "•"; }
