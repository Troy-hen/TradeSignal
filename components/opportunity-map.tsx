"use client";

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

type Selection =
  | { kind: "district"; id: string }
  | { kind: "opportunity"; id: string }
  | { kind: "signal"; id: string }
  | { kind: "signal-cluster"; id: string }
  | null;

type DistrictCluster = OpportunityMapPoint;

type SignalCluster = {
  id: string;
  latitude: number;
  longitude: number;
  signals: MarketSignalMapPoint[];
};

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
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const mapViewportRef = useRef<HTMLDivElement>(null);

  function changeZoom(nextZoom: number) {
    setZoom(clamp(nextZoom, 0.55, 3.2));
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
      x: clamp(drag.originX + event.clientX - drag.startX, -1000, 1000),
      y: clamp(drag.originY + event.clientY - drag.startY, -700, 700),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      dragRef.current = null;
      setIsDragging(false);
    }
  }


  function resetMap() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setZoom((current) => clamp(current + (event.deltaY < 0 ? 0.12 : -0.12), 0.55, 3.2));
    };
    viewport.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleNativeWheel);
  }, []);

  const districtClusters = useMemo(() => clusterPlanningPoints(points), [points]);
  const signalClusters = useMemo(() => clusterSignals(signals, zoom), [signals, zoom]);
  const showIndividualOpportunities = zoom >= 1.85;
  const selectedDistrict = selection?.kind === "district" ? districtClusters.find((point) => point.postcode_district === selection.id) ?? null : null;
  const selectedOpportunity = selection?.kind === "opportunity" ? points.find((point) => point.teaser_opportunity_id === selection.id) ?? null : null;
  const selectedSignal = selection?.kind === "signal" ? signals.find((signal) => signal.market_signal_trade_match_id === selection.id) ?? null : null;
  const selectedSignalCluster = selection?.kind === "signal-cluster" ? signalClusters.find((cluster) => cluster.id === selection.id) ?? null : null;
  const mappedCount = points.reduce((sum, point) => sum + Number(point.opportunity_count ?? 0), 0) + signals.length;

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-light-grey bg-white p-4 sm:p-7">
      <div className="min-w-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity map</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">See where buying windows are building.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Drag or scroll to explore the filtered Marketplace. Zoom in to separate individual opportunities, then select a marker to inspect its teaser on the right.</p>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.45fr)]">
        <div ref={mapViewportRef} className="relative min-h-[430px] min-w-0 overflow-hidden overscroll-contain rounded-2xl border border-[#cbd9de] bg-[#e8f0f2] sm:min-h-[560px]" role="region" aria-label="Interactive opportunity exploration map">
          <div
            className={`absolute inset-y-0 left-1/2 h-full w-auto select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ aspectRatio: "2 / 1", transform: `translate3d(calc(-50% + ${pan.x}px), ${pan.y}px, 0) scale(${zoom})`, transformOrigin: "center" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-label="Approximate opportunity map of the United Kingdom"
          >
            <div className="absolute inset-0 overflow-hidden bg-[#dbe7e7]">
              <div className="grid h-full w-full grid-cols-4 grid-rows-2">
                {MAP_TILES.map((tile) => <div key={tile} aria-hidden="true" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${tile})` }} />)}
              </div>
              <div className="absolute inset-0 bg-white/10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0,rgba(232,240,242,0.04)_55%,rgba(31,41,55,0.12)_100%)]" />
            </div>

            {showIndividualOpportunities
              ? points.map((point, index) => {
                  const id = point.teaser_opportunity_id ?? `${point.postcode_district}-${index}`;
                  const offset = markerOffset(id);
                  return <button key={`opportunity-${id}`} type="button" onClick={() => point.teaser_opportunity_id && setSelection({ kind: "opportunity", id: point.teaser_opportunity_id })} className={`absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-signal-orange text-[10px] font-black text-white shadow-lg transition hover:scale-110 ${selectedOpportunity?.teaser_opportunity_id === point.teaser_opportunity_id ? "ring-4 ring-signal-orange/30" : ""}`} style={positionStyle(point.latitude + offset.latitude, point.longitude + offset.longitude)} aria-label={`View ${point.teaser_project_type ?? "opportunity"} in ${point.post_town || point.postcode_district}`}>•</button>;
                })
              : districtClusters.map((point) => (
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
            <span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-signal-orange" />Business-change opportunity</span>
            <span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded bg-charcoal" />Public/commercial opportunity</span>
            <span className="min-w-max text-slate/70">Drag to explore · scroll to zoom</span><span className="min-w-max text-slate/70">Approximate markers · © OpenStreetMap contributors</span>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-light-grey bg-soft-surface p-5">
          {selectedSignalCluster ? <SignalClusterPanel cluster={selectedSignalCluster} onSelect={(id) => setSelection({ kind: "signal", id })} /> : selectedSignal ? <SignalPanel signal={selectedSignal} /> : selectedOpportunity ? <OpportunityPanel point={selectedOpportunity} /> : selectedDistrict ? <DistrictPanel point={selectedDistrict} /> : <MapSummary count={mappedCount} areas={districtClusters.length} clusters={signalClusters.length} showIndividualOpportunities={showIndividualOpportunities} />}
        </div>
      </div>
    </section>
  );
}

function DistrictPanel({ point }: { point: DistrictCluster }) {
  const count = Number(point.opportunity_count ?? 0);
  const needs = point.teaser_needs?.filter(Boolean).slice(0, 5) ?? [];
  return <>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Selected area</p>
    <h3 className="mt-2 text-2xl font-bold text-charcoal">{point.post_town || point.postcode_district}</h3>
    <p className="mt-1 text-sm text-slate">{point.postcode_district} · profile-matched opportunity density</p>
    <dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Opportunities" value={String(count)} /><Metric label="Indicative value" value={formatGbpRange(point.estimated_trade_value_low, point.estimated_trade_value_high)} /><Metric label="Source" value={humanize(point.teaser_source ?? "Business change")} /><Metric label="Map marker" value="Approximate" /></dl>
    {point.teaser_project_type && <div className="mt-5 rounded-2xl border border-signal-orange/20 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">Top opportunity teaser</p>
      <h4 className="mt-2 text-base font-bold leading-6 text-charcoal">{point.teaser_project_type}</h4>
      {point.teaser_summary && <p className="mt-2 text-xs leading-5 text-slate">{point.teaser_summary}</p>}
      {needs.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{needs.map((need) => <span key={need} className="rounded-full bg-soft-surface px-2 py-1 text-[10px] font-semibold text-slate">{need}</span>)}</div>}
      {point.teaser_opportunity_id && <div className="mt-4"><LeadUnlockButton opportunityId={point.teaser_opportunity_id} compact /></div>}
    </div>}
    <p className="mt-5 rounded-xl border border-signal-orange/15 bg-white px-3 py-3 text-xs leading-5 text-slate">Zoom in to separate individual opportunities in this area, or use Cards to compare the filtered queue.</p>
  </>;
}

function OpportunityPanel({ point }: { point: OpportunityMapPoint }) {
  const needs = point.teaser_needs?.filter(Boolean).slice(0, 5) ?? [];
  return <>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">Opportunity teaser</span>{point.teaser_status && <span className="rounded-full border border-light-grey bg-white px-2.5 py-1 text-[10px] font-semibold text-slate">{humanize(point.teaser_status)}</span>}</div>
    <h3 className="mt-3 text-xl font-bold leading-tight text-charcoal">{point.teaser_project_type ?? "Buying-window opportunity"}</h3>
    <p className="mt-2 text-sm leading-6 text-slate">{point.post_town || point.postcode_district} · {point.postcode_district} · approximate area</p>
    {point.teaser_summary && <div className="mt-4 rounded-2xl border border-signal-orange/15 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">Why now</p><p className="mt-2 text-xs leading-5 text-slate">{point.teaser_summary}</p></div>}
    <dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Customer fit" value={point.teaser_score == null ? "Under review" : `${Math.round(point.teaser_score)}/100`} /><Metric label="Indicative value" value={formatGbpRange(point.teaser_estimated_trade_value_low ?? null, point.teaser_estimated_trade_value_high ?? null)} /><Metric label="Source" value={humanize(point.teaser_source ?? "Unified intelligence")} /></dl>
    {needs.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{needs.map((need) => <span key={need} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate">{need}</span>)}</div>}
    {point.teaser_opportunity_id && <div className="mt-5"><LeadUnlockButton opportunityId={point.teaser_opportunity_id} /></div>}
  </>;
}

function SignalPanel({ signal }: { signal: MarketSignalMapPoint }) {
  return <>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">{humanize(signal.signal_type)}</span>{signal.location_scope === "regional" && <span className="rounded-full border border-dashed border-charcoal/30 px-2.5 py-1 text-[10px] font-semibold text-slate">Regional marker</span>}</div>
    <h3 className="mt-3 text-xl font-bold leading-tight text-charcoal">{signal.title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate">{signal.location_label}{signal.buyer_name ? ` · ${signal.buyer_name}` : ""}</p>
    <dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Customer fit" value={signal.fit_score == null ? "Under review" : `${Math.round(signal.fit_score)}/100`} /><Metric label="Indicative value" value={formatGbpRange(signal.estimated_trade_value_low, signal.estimated_trade_value_high)} /><Metric label="Access" value="Opportunity teaser" /></dl>
    <div className="mt-5"><LeadUnlockButton marketSignalId={signal.market_signal_trade_match_id} /></div>
  </>;
}

function SignalClusterPanel({ cluster, onSelect }: { cluster: SignalCluster; onSelect: (id: string) => void }) {
  const topSignals = cluster.signals.slice(0, 5);
  return <>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Opportunity cluster</p>
    <h3 className="mt-2 text-2xl font-bold text-charcoal">{cluster.signals.length} opportunities nearby</h3>
    <p className="mt-1 text-sm leading-6 text-slate">Select an opportunity below to replace this panel with its teaser. Zoom in further to separate the markers.</p>
    <div className="mt-5 space-y-3 border-t border-light-grey pt-4">{topSignals.map((signal) => <button type="button" onClick={() => onSelect(signal.market_signal_trade_match_id)} key={signal.market_signal_trade_match_id} className="block w-full rounded-xl border border-transparent bg-white p-3 text-left transition hover:border-signal-orange/30"><p className="text-xs font-semibold text-charcoal">{signal.title}</p><p className="mt-1 text-[11px] text-slate">{signal.location_label} · {humanize(signal.signal_type)}</p><span className="mt-2 inline-flex text-[11px] font-semibold text-signal-orange">View teaser →</span></button>)}</div>
  </>;
}

function MapSummary({ count, areas, clusters, showIndividualOpportunities }: { count: number; areas: number; clusters: number; showIndividualOpportunities: boolean }) {
  return <>
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-lg text-signal-orange">⌖</div>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Filtered Marketplace</p>
    <h3 className="mt-2 text-2xl font-bold text-charcoal">{count.toLocaleString("en-GB")} mapped opportunities</h3>
    <p className="mt-2 text-sm leading-6 text-slate">The map uses the same source, priority and stage filters as Cards. Select any marker to inspect the corresponding teaser here.</p>
    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-light-grey pt-4"><Metric label="Business areas" value={String(areas)} /><Metric label="Other clusters" value={String(clusters)} /></div>
    <p className="mt-5 rounded-xl border border-light-grey bg-white px-3 py-3 text-xs leading-5 text-slate">{showIndividualOpportunities ? "Individual business-change opportunities are now separated. Select a marker to review its teaser." : "Zoom in to separate individual opportunities. Markers remain approximate discovery points."}</p>
  </>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">{label}</dt><dd className="mt-1 text-sm font-semibold text-charcoal">{value}</dd></div>; }

function clusterPlanningPoints(points: OpportunityMapPoint[]): DistrictCluster[] {
  const grouped = new Map<string, DistrictCluster>();
  for (const point of points) {
    const existing = grouped.get(point.postcode_district);
    if (!existing) {
      grouped.set(point.postcode_district, { ...point });
      continue;
    }
    const shouldReplaceTeaser = Number(point.teaser_score ?? 0) > Number(existing.teaser_score ?? 0);
    existing.opportunity_count += Number(point.opportunity_count ?? 0);
    existing.estimated_trade_value_low += Number(point.estimated_trade_value_low ?? 0);
    existing.estimated_trade_value_high += Number(point.estimated_trade_value_high ?? 0);
    existing.commercial_opportunity_count = Number(existing.commercial_opportunity_count ?? 0) + Number(point.commercial_opportunity_count ?? 0);
    existing.commercial_estimated_trade_value_low = Number(existing.commercial_estimated_trade_value_low ?? 0) + Number(point.commercial_estimated_trade_value_low ?? 0);
    existing.commercial_estimated_trade_value_high = Number(existing.commercial_estimated_trade_value_high ?? 0) + Number(point.commercial_estimated_trade_value_high ?? 0);
    existing.teaser_needs = uniqueStrings([...(existing.teaser_needs ?? []), ...(point.teaser_needs ?? [])]);
    if (shouldReplaceTeaser) {
      existing.post_town = point.post_town;
      existing.latitude = point.latitude;
      existing.longitude = point.longitude;
      existing.teaser_opportunity_id = point.teaser_opportunity_id;
      existing.teaser_project_type = point.teaser_project_type;
      existing.teaser_summary = point.teaser_summary;
      existing.teaser_score = point.teaser_score;
      existing.teaser_needs = point.teaser_needs;
      existing.teaser_source = point.teaser_source;
    }
  }
  return [...grouped.values()].sort((a, b) => b.opportunity_count - a.opportunity_count);
}

function clusterSignals(signals: MarketSignalMapPoint[], zoom: number): SignalCluster[] {
  const grouped = new Map<string, MarketSignalMapPoint[]>();
  const scale = Math.max(0.18, zoom * zoom);
  const latitudeCell = 0.35 / scale;
  const longitudeCell = 0.45 / scale;
  for (const signal of signals) {
    const lat = Math.round(signal.latitude / latitudeCell);
    const lon = Math.round(signal.longitude / longitudeCell);
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

function uniqueStrings(values: string[]): string[] { return [...new Set(values.filter(Boolean))]; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function humanize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function signalIcon(value: string) { if (value === "tender") return "T"; if (value === "contract_award") return "A"; if (value === "public_pipeline") return "P"; return "•"; }
function markerOffset(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) | 0;
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const distance = 0.035 + (Math.abs(hash >> 8) % 4) * 0.012;
  return { latitude: Math.sin(angle) * distance, longitude: Math.cos(angle) * distance * 1.5 };
}
