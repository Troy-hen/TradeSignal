"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LeadUnlockButton } from "@/components/marketplace/lead-unlock-button";
import { formatGbp } from "@/components/opportunity-badge";
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
type Selection = { kind: "district"; id: string } | { kind: "signal"; id: string } | null;

const LAYERS: Array<{ value: Layer; label: string }> = [
  { value: "all", label: "All signals" },
  { value: "planning", label: "Business change" },
  { value: "commercial_development", label: "Commercial change" },
  { value: "tender", label: "Tenders" },
  { value: "public_pipeline", label: "Public pipeline" },
  { value: "contract_award", label: "Awards" },
];

export function OpportunityMap({ points, signals }: { points: OpportunityMapPoint[]; signals: MarketSignalMapPoint[]; trades?: unknown[] }) {
  const [layer, setLayer] = useState<Layer>("all");
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoom] = useState(1);
  const filteredPoints = useMemo(() => layer === "tender" || layer === "public_pipeline" || layer === "contract_award" ? [] : layer === "commercial_development" ? points.filter((point) => Number(point.commercial_opportunity_count ?? 0) > 0) : points, [layer, points]);
  const filteredSignals = useMemo(() => layer === "planning" || layer === "commercial_development" ? [] : layer === "all" ? signals : signals.filter((signal) => signal.signal_type === layer), [layer, signals]);
  const selectedPoint = selection?.kind === "district" ? filteredPoints.find((point) => point.postcode_district === selection.id) ?? null : null;
  const selectedSignal = selection?.kind === "signal" ? filteredSignals.find((signal) => signal.market_signal_trade_match_id === selection.id) ?? null : null;
  const mappedCount = filteredPoints.reduce((sum, point) => sum + Number(point.opportunity_count ?? 0), 0) + filteredSignals.length;

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-light-grey bg-white p-4 sm:p-7">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity map</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">See where buying windows are building.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate">Explore opportunity density across the UK by signal layer. Markers are approximate; the marketplace is where you review the full teaser and unlock a lead.</p></div><Link href="/opportunities" className="shrink-0 text-sm font-semibold text-signal-orange">Open marketplace →</Link></div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{LAYERS.map((item) => <button key={item.value} type="button" onClick={() => { setLayer(item.value); setSelection(null); }} className={`min-w-max rounded-xl border px-3 py-2 text-xs font-semibold transition ${layer === item.value ? "border-signal-orange bg-signal-orange text-white" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}>{item.label} <span className={layer === item.value ? "text-white/70" : "text-slate"}>{countForLayer(item.value, points, signals)}</span></button>)}</div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.45fr)]">
        <div className="relative min-h-[430px] min-w-0 overflow-hidden rounded-2xl border border-[#cbd9de] bg-[#e8f0f2] sm:min-h-[560px]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90"><img src="https://tile.openstreetmap.org/5/15/10.png" alt="" className="absolute h-full w-full object-cover" draggable={false} /><div className="absolute inset-0 bg-white/10" /></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0,rgba(232,240,242,0.08)_55%,rgba(31,41,55,0.14)_100%)]" />
          {filteredPoints.map((point) => <button key={`district-${point.postcode_district}-${point.trade_slug}`} type="button" onClick={() => setSelection({ kind: "district", id: point.postcode_district })} className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-signal-orange px-2.5 py-2 text-xs font-bold text-white shadow-lg transition hover:scale-110 ${selectedPoint?.postcode_district === point.postcode_district ? "ring-4 ring-signal-orange/30" : ""}`} style={positionStyle(point.latitude, point.longitude, zoom)} aria-label={`${point.opportunity_count} opportunities in ${point.post_town || point.postcode_district}`}>{point.opportunity_count}</button>)}
          {filteredSignals.map((signal) => <button key={`signal-${signal.market_signal_trade_match_id}`} type="button" onClick={() => setSelection({ kind: "signal", id: signal.market_signal_trade_match_id })} className={`absolute z-30 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 border-white bg-charcoal text-[10px] font-black text-white shadow-lg transition hover:scale-110 ${selectedSignal?.market_signal_trade_match_id === signal.market_signal_trade_match_id ? "ring-4 ring-signal-orange/30" : ""}`} style={positionStyle(signal.latitude, signal.longitude, zoom)} aria-label={`${signal.signal_type}: ${signal.title}`}>{signalIcon(signal.signal_type)}</button>)}
          <div className="absolute right-3 top-3 z-40 flex overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-lg"><button type="button" onClick={() => setZoom((value) => Math.min(1.65, value + 0.15))} className="h-9 w-9 text-lg font-semibold text-charcoal hover:bg-soft-surface" aria-label="Zoom in">+</button><button type="button" onClick={() => setZoom((value) => Math.max(0.8, value - 0.15))} className="h-9 w-9 border-l border-light-grey text-lg font-semibold text-charcoal hover:bg-soft-surface" aria-label="Zoom out">−</button><button type="button" onClick={() => setZoom(1)} className="h-9 w-9 border-l border-light-grey text-xs font-semibold text-charcoal hover:bg-soft-surface" aria-label="Reset map">↺</button></div>
          <div className="absolute bottom-3 left-3 right-3 z-40 flex gap-3 overflow-x-auto rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate shadow-sm"><span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-signal-orange" />Business change</span><span className="min-w-max"><span className="mr-1 inline-block h-2 w-2 rounded bg-charcoal" />Public signal</span><span className="min-w-max text-slate/70">Approximate markers · © OpenStreetMap</span></div>
        </div>
        <div className="min-w-0 rounded-2xl border border-light-grey bg-soft-surface p-5">{selectedSignal ? <SignalPanel signal={selectedSignal} /> : selectedPoint ? <DistrictPanel point={selectedPoint} layer={layer} /> : <MapSummary count={mappedCount} layer={layer} />}</div>
      </div>
    </section>
  );
}

function DistrictPanel({ point, layer }: { point: OpportunityMapPoint; layer: Layer }) { const commercial = layer === "commercial_development"; const count = commercial ? Number(point.commercial_opportunity_count ?? 0) : Number(point.opportunity_count ?? 0); const low = commercial ? Number(point.commercial_estimated_trade_value_low ?? 0) : point.estimated_trade_value_low; const high = commercial ? Number(point.commercial_estimated_trade_value_high ?? 0) : point.estimated_trade_value_high; return <><p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Selected area</p><h3 className="mt-2 text-2xl font-bold text-charcoal">{point.post_town || point.postcode_district}</h3><p className="mt-1 text-sm text-slate">{point.postcode_district} · approximate opportunity density</p><dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Open signals" value={String(count)} /><Metric label="Indicative value" value={formatGbp(low, high)} /><Metric label="Signal layer" value={commercial ? "Commercial change" : "Business change"} /><Metric label="Map status" value="Preview" /></dl><p className="mt-5 rounded-xl border border-signal-orange/15 bg-white px-3 py-3 text-xs leading-5 text-slate">The map shows density, not exclusive territory. Open the marketplace to review relevant teasers and unlock individual leads for £20.</p><Link href="/opportunities?source=planning" className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white">Review area opportunities →</Link></>; }
function SignalPanel({ signal }: { signal: MarketSignalMapPoint }) { return <><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">{humanize(signal.signal_type)}</span>{signal.location_scope === "regional" && <span className="rounded-full border border-dashed border-charcoal/30 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-charcoal">Regional marker</span>}</div><h3 className="mt-3 text-lg font-bold leading-6 text-charcoal">{signal.title}</h3><p className="mt-2 text-sm text-slate">{signal.location_label} · approximate location</p><dl className="mt-5 space-y-3 border-t border-light-grey pt-4"><Metric label="Fit score" value={signal.fit_score === null ? "—" : `${Math.round(signal.fit_score)}/100`} /><Metric label="Indicative value" value={formatGbp(signal.estimated_trade_value_low, signal.estimated_trade_value_high)} /><Metric label="Deadline" value={signal.deadline_at ? new Date(signal.deadline_at).toLocaleDateString("en-GB") : "Not stated"} /></dl><div className="mt-5"><LeadUnlockButton marketSignalId={signal.market_signal_trade_match_id} /></div><p className="mt-3 text-xs leading-5 text-slate">Unlock reveals the complete signal, evidence and contact context when available.</p></>; }
function MapSummary({ count, layer }: { count: number; layer: Layer }) { return <div className="flex min-h-[250px] flex-col justify-center"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-lg font-bold text-signal-orange">⌖</div><p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">{LAYERS.find((item) => item.value === layer)?.label}</p><h3 className="mt-2 text-xl font-bold text-charcoal">{count} mapped signal{count === 1 ? "" : "s"}</h3><p className="mt-2 text-sm leading-6 text-slate">Select a marker to inspect the area or signal. Use the layer chips to compare demand across all available intelligence.</p></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><dt className="text-xs text-slate">{label}</dt><dd className="text-sm font-semibold text-charcoal">{value}</dd></div>; }
function countForLayer(layer: Layer, points: OpportunityMapPoint[], signals: MarketSignalMapPoint[]): number { if (layer === "planning") return points.reduce((sum, point) => sum + Number(point.opportunity_count ?? 0), 0); if (layer === "commercial_development") return points.reduce((sum, point) => sum + Number(point.commercial_opportunity_count ?? 0), 0); if (layer === "all") return points.reduce((sum, point) => sum + Number(point.opportunity_count ?? 0), 0) + signals.length; return signals.filter((signal) => signal.signal_type === layer).length; }
function positionStyle(latitude: number, longitude: number, zoom: number): { left: string; top: string } { const x = Math.min(96, Math.max(4, ((longitude + 8.5) / 10.7) * 100)); const y = Math.min(94, Math.max(6, ((59.5 - latitude) / 10) * 100)); const left = Math.min(98, Math.max(2, 50 + (x - 50) * zoom)); const top = Math.min(98, Math.max(2, 50 + (y - 50) * zoom)); return { left: `${left}%`, top: `${top}%` }; }
function signalIcon(value: string): string { if (value === "tender") return "T"; if (value === "public_pipeline") return "P"; if (value === "contract_award") return "A"; return "C"; }
function humanize(value: string): string { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
