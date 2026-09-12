"use client";

import { useEffect, useState } from "react";
import type { StoredPropertyIntelligence } from "@/lib/data/property-intelligence";

type StoredEpcIntelligence = {
  id: string;
  certificate_scope: "domestic" | "non_domestic" | "display";
  certificate_number: string;
  uprn: string | null;
  matched_address: string | null;
  postcode: string | null;
  match_confidence: number;
  current_band: string | null;
  current_efficiency: number | null;
  potential_band: string | null;
  potential_efficiency: number | null;
  property_type: string | null;
  built_form: string | null;
  floor_area: number | null;
  construction_age_band: string | null;
  main_heating_description: string | null;
  main_fuel: string | null;
  roof_description: string | null;
  windows_description: string | null;
  walls_description: string | null;
  mains_gas: boolean | null;
  solar_water_heating: boolean | null;
  energy_mix: string | null;
  fuel_sources: string[];
  has_heat_pump: boolean | null;
  has_solar_pv: boolean | null;
  renewable_sources: string[];
  air_conditioning: boolean | null;
  other_fuel_description: string | null;
  energy_consumption_current: number | null;
  co2_emissions_current: number | null;
  improvement_signals: string[];
  signal_summary: string | null;
  registration_date: string | null;
  retrieved_at: string;
  expires_at: string | null;
};

export function PropertyIntelligencePanel({ opportunityId, configured, initialIntelligence }: {
  opportunityId: string;
  configured: boolean;
  initialIntelligence: StoredPropertyIntelligence | null;
}) {
  const [intelligence, setIntelligence] = useState(initialIntelligence);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epc, setEpc] = useState<StoredEpcIntelligence | null>(null);
  const [epcConfigured, setEpcConfigured] = useState(false);
  const [epcChecked, setEpcChecked] = useState(false);
  const [epcLoading, setEpcLoading] = useState(false);
  const [epcError, setEpcError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/energy-intelligence`, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, payload: await response.json().catch(() => ({})) }))
      .then(({ ok, payload }) => {
        if (!active || !ok) return;
        setEpcConfigured(payload.configured === true);
        if (payload.intelligence) setEpc(payload.intelligence as StoredEpcIntelligence);
      })
      .catch(() => undefined)
      .finally(() => active && setEpcChecked(true));
    return () => { active = false; };
  }, [opportunityId]);

  async function enrich(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/property-intelligence`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }),
      });
      const payload = (await response.json()) as { intelligence?: StoredPropertyIntelligence; error?: string; message?: string };
      if (!response.ok || !payload.intelligence) throw new Error(payload.message ?? friendlyError(payload.error));
      setIntelligence(payload.intelligence);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Property intelligence could not be refreshed.");
    } finally { setLoading(false); }
  }

  async function enrichEpc(refresh = false) {
    setEpcLoading(true);
    setEpcError(null);
    try {
      const response = await fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/energy-intelligence`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }),
      });
      const payload = (await response.json()) as { intelligence?: StoredEpcIntelligence; error?: string; message?: string };
      if (!response.ok || !payload.intelligence) throw new Error(payload.message ?? friendlyEpcError(payload.error));
      setEpc(payload.intelligence);
      setEpcConfigured(true);
    } catch (cause) {
      setEpcError(cause instanceof Error ? cause.message : "Energy intelligence could not be refreshed.");
    } finally { setEpcLoading(false); }
  }

  if (!configured && !intelligence && epcChecked && !epcConfigured && !epc) return null;

  return (
    <>
      {intelligence ? (
        <section className="mt-6 overflow-hidden rounded-3xl border border-light-grey bg-white">
          <div className="flex flex-col gap-4 bg-soft-surface p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Property context</p><SignalBadge signal={intelligence.timing_signal} /></div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Property activity around this planning opportunity</h2>
              <p className="mt-2 text-sm leading-6 text-slate">TwentyCI property intelligence matched at {Math.round(Number(intelligence.match_confidence) * 100)}% confidence. These signals help judge timing and context; they do not identify the homeowner or create permission to email them.</p>
            </div>
            {configured && <button type="button" disabled={loading} onClick={() => enrich(true)} className="inline-flex shrink-0 items-center justify-center rounded-xl border border-light-grey bg-white px-3.5 py-2 text-xs font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button>}
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
              <ul className="mt-3 space-y-2">{intelligence.timing_reasons.map((reason) => <SignalLine key={reason}>{reason}</SignalLine>)}</ul>
              {intelligence.planning_history.length > 0 && <div className="mt-5 border-t border-light-grey pt-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Property planning history</p><p className="mt-1 text-xs text-slate">TwentyCI has {intelligence.planning_history.length} planning record{intelligence.planning_history.length === 1 ? "" : "s"} associated with this UPRN.</p><ul className="mt-3 space-y-2">{intelligence.planning_history.slice(0, 4).map((item, index) => <li key={`${item.planningId ?? "planning"}-${index}`} className="rounded-xl border border-light-grey bg-white px-3.5 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-charcoal">{item.decision ?? "Planning record"}</p>{item.receivedDate && <span className="text-[10px] font-medium text-slate">{formatDate(item.receivedDate)}</span>}</div></li>)}</ul></div>}
            </div>
            <div className="rounded-2xl border border-light-grey bg-soft-surface p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Property profile</p><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><SmallDetail label="Bedrooms" value={numberOrDash(intelligence.bedrooms)} /><SmallDetail label="Bathrooms" value={numberOrDash(intelligence.bathrooms)} /><SmallDetail label="Garden" value={yesNo(intelligence.garden)} /><SmallDetail label="Parking" value={yesNo(intelligence.parking)} /><SmallDetail label="Planning records" value={String(intelligence.planning_history.length)} /><SmallDetail label="UPRN" value={intelligence.uprn} /><SmallDetail label="Updated" value={formatDate(intelligence.retrieved_at)} /></dl></div>
          </div>
          {error && <p className="px-5 pb-5 text-sm text-danger sm:px-6">{error}</p>}
        </section>
      ) : configured ? (
        <section className="mt-6 rounded-3xl border border-light-grey bg-white p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Property context</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Add property-level timing intelligence</h2><p className="mt-2 text-sm leading-6 text-slate">Match this project address to TwentyCI to surface property value, recent market activity, transaction recency and planning history. This enriches timing intelligence; it does not reveal private homeowner contact details.</p></div><button type="button" disabled={loading} onClick={() => enrich(false)} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-orange disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Checking property…" : "Enrich property"}</button></div>{error && <p className="mt-3 text-sm text-danger">{error}</p>}</section>
      ) : null}

      {(epcConfigured || epc) && (
        <section className="mt-6 overflow-hidden rounded-3xl border border-signal-orange/20 bg-white">
          {epc ? (
            <>
              <div className="flex flex-col gap-4 bg-signal-orange/[0.04] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Energy intelligence</p><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-charcoal">Official {scopeLabel(epc.certificate_scope)}</span></div>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Energy and building-services context</h2>
                  <p className="mt-2 text-sm leading-6 text-slate">{epc.signal_summary ?? "An Energy Performance Certificate was matched to this project address."}</p>
                </div>
                {epcConfigured && <button type="button" disabled={epcLoading} onClick={() => enrichEpc(true)} className="inline-flex shrink-0 items-center justify-center rounded-xl border border-signal-orange/20 bg-white px-3.5 py-2 text-xs font-semibold text-charcoal transition hover:border-signal-orange/50 hover:text-signal-orange disabled:opacity-50">{epcLoading ? "Refreshing…" : "Refresh energy data"}</button>}
              </div>

              <dl className="grid gap-px bg-light-grey sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Current EPC" value={epcRating(epc.current_band, epc.current_efficiency)} />
                <Metric label="Potential EPC" value={epcRating(epc.potential_band, epc.potential_efficiency)} />
                <Metric label="Recorded energy mix" value={epc.energy_mix ?? "Not recorded"} />
                <Metric label="Floor area" value={epc.floor_area !== null ? `${formatNumber(epc.floor_area)} m²` : "Not available"} />
              </dl>

              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Systems & low-carbon signals</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <SystemFlag label="Heat pump" value={epc.has_heat_pump} />
                    <SystemFlag label="Solar PV" value={epc.has_solar_pv} />
                    <SystemFlag label="Solar water heating" value={epc.solar_water_heating} />
                    <SystemFlag label="Air conditioning" value={epc.air_conditioning} />
                  </div>
                  {epc.renewable_sources?.length > 0 && <p className="mt-3 rounded-xl bg-success/[0.05] px-3.5 py-3 text-xs leading-5 text-charcoal"><span className="font-semibold">Recorded low-carbon sources:</span> {epc.renewable_sources.map(prettyEnergyToken).join(", ")}.</p>}

                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-slate">Commercially relevant energy signals</p>
                  {epc.improvement_signals.length > 0 ? <ul className="mt-3 space-y-2">{epc.improvement_signals.map((signal) => <SignalLine key={signal}>{signal}</SignalLine>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate">No strong upgrade signal was derived from the certificate. Keep the energy record as supporting building context rather than assuming improvement intent.</p>}
                  <p className="mt-4 text-xs leading-5 text-slate">This works for homes and, where a non-domestic EPC exists, shops, offices and other commercial premises. Recorded systems help qualify relevance; they do not prove that an owner or occupier intends to buy work.</p>
                </div>

                <div className="rounded-2xl border border-light-grey bg-soft-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Building fabric & systems</p>
                  <dl className="mt-3 space-y-3 text-sm">
                    <SmallDetail label={epc.certificate_scope === "non_domestic" ? "Building / use" : "Property type"} value={[epc.property_type, epc.built_form].filter(Boolean).join(" · ") || "Not available"} />
                    <SmallDetail label="Heating" value={epc.main_heating_description ?? epc.main_fuel ?? "Not available"} />
                    <SmallDetail label="Fuel sources" value={epc.fuel_sources?.length ? epc.fuel_sources.map(prettyEnergyToken).join(", ") : "Not recorded"} />
                    {epc.other_fuel_description && <SmallDetail label="Other fuel detail" value={epc.other_fuel_description} />}
                    <SmallDetail label="Roof" value={epc.roof_description ?? "Not available"} />
                    <SmallDetail label="Windows" value={epc.windows_description ?? "Not available"} />
                    <SmallDetail label="Walls" value={epc.walls_description ?? "Not available"} />
                    {epc.construction_age_band && <SmallDetail label="Building age" value={epc.construction_age_band} />}
                    {epc.energy_consumption_current !== null && <SmallDetail label="Recorded energy use" value={formatNumber(epc.energy_consumption_current)} />}
                    {epc.co2_emissions_current !== null && <SmallDetail label="Recorded CO₂" value={formatNumber(epc.co2_emissions_current)} />}
                    <SmallDetail label="Certificate" value={epc.registration_date ? `Registered ${formatDate(epc.registration_date)}` : epc.certificate_number} />
                  </dl>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Energy intelligence</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Check building energy & systems data</h2><p className="mt-2 text-sm leading-6 text-slate">Match the project address against official domestic and non-domestic Energy Performance data. MyTradeBox can surface EPC rating, recorded fuel mix, heat pumps, solar PV, air conditioning and building-fabric context when the certificate contains it.</p></div>
              <button type="button" disabled={epcLoading} onClick={() => enrichEpc(false)} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-50">{epcLoading ? "Checking energy data…" : "Check energy data"}</button>
            </div>
          )}
          {epcError && <p className="px-5 pb-5 text-sm text-danger sm:px-6">{epcError}</p>}
        </section>
      )}
    </>
  );
}

function SignalLine({ children }: { children: React.ReactNode }) { return <li className="flex items-start gap-2 text-sm leading-6 text-charcoal"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-orange" /><span>{children}</span></li>; }
function SignalBadge({ signal }: { signal: StoredPropertyIntelligence["timing_signal"] }) {
  const label = signal === "strong" ? "Recent activity" : signal === "positive" ? "Useful recency" : signal === "caution" ? "Review timing" : "Neutral activity";
  const classes = signal === "strong" ? "bg-success/10 text-success" : signal === "positive" ? "bg-signal-orange/10 text-signal-orange" : signal === "caution" ? "bg-warning/10 text-warning" : "bg-white text-slate";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${classes}`}>{label}</span>;
}
function SystemFlag({ label, value }: { label: string; value: boolean | null }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-light-grey bg-white px-3.5 py-3"><span className="text-xs font-semibold text-charcoal">{label}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${value === true ? "bg-success/10 text-success" : value === false ? "bg-soft-surface text-slate" : "bg-warning/10 text-warning"}`}>{value === true ? "Recorded" : value === false ? "Not recorded" : "Unknown"}</span></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 bg-white p-4 sm:p-5"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt><dd className="mt-2 break-words text-sm font-bold leading-5 text-charcoal">{value}</dd></div>; }
function SmallDetail({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-[0.09em] text-slate">{label}</dt><dd className="mt-1 break-words font-semibold leading-5 text-charcoal">{value}</dd></div>; }
function formatGbp(value: number | null) { return value === null ? "Not available" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value); }
function formatNumber(value: number) { return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date); }
function epcRating(band: string | null, score: number | null) { return band ? `${band}${score !== null ? ` · ${Math.round(score)}` : ""}` : score !== null ? String(Math.round(score)) : "Not available"; }
function numberOrDash(value: number | null) { return value === null ? "—" : String(value); }
function yesNo(value: boolean | null) { return value === null ? "—" : value ? "Yes" : "No"; }
function scopeLabel(scope: StoredEpcIntelligence["certificate_scope"]) { return scope === "non_domestic" ? "non-domestic EPC data" : scope === "display" ? "display energy data" : "domestic EPC data"; }
function prettyEnergyToken(value: string) { return ({ mains_gas: "Mains gas", electricity: "Electricity", oil: "Oil", lpg: "LPG", biomass: "Biomass", solid_fuel: "Solid fuel", district_heat: "District heat", solar_pv: "Solar PV", solar_thermal: "Solar thermal", heat_pump: "Heat pump", wind: "Wind" } as Record<string, string>)[value] ?? value.replace(/_/g, " "); }
function friendlyError(error?: string) {
  if (error === "property_not_matched") return "TwentyCI could not confidently match this project address to a property record.";
  if (error === "property_address_incomplete") return "This planning record does not contain enough address data for property enrichment.";
  return "Property intelligence could not be loaded right now.";
}
function friendlyEpcError(error?: string) {
  if (error === "epc_not_matched") return "No sufficiently confident domestic or non-domestic EPC match was found for this project address.";
  if (error === "property_address_incomplete") return "This planning record does not contain enough address data to check Energy Performance data.";
  if (error === "epc_auth_failed") return "The EPC API token needs to be refreshed in the deployment configuration.";
  if (error === "epc_rate_limited") return "The Energy Performance service is temporarily rate-limiting requests. Try again shortly.";
  return "Energy intelligence could not be loaded right now.";
}
