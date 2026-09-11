import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { getTerritoryTradeIntelligence, getTerritoryTradeSignalFeed } from "@/lib/data/trade-intelligence";
import { formatGbp, formatGbpRange } from "@/components/opportunity-badge";
import { formatMonthlyGbp, COVERAGE_PLANS, LEAD_UNLOCK_PRICE_GBP } from "@/lib/coverage/pricing";

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  available: { label: "Preview ready", className: "text-success" },
  reserved: { label: "Preview ready", className: "text-success" },
  active: { label: "Coverage connected", className: "text-success" },
  suspended: { label: "Coverage needs attention", className: "text-warning" },
};
const SIGNAL_LABEL: Record<string, string> = { planning: "Planning", tender: "Tender", public_pipeline: "Public pipeline", contract_award: "Contract award", commercial_development: "Commercial build" };

export default async function TerritoryDetailPage({ params }: { params: Promise<{ postcodeDistrict: string; tradeSlug: string }> }) {
  const { postcodeDistrict, tradeSlug } = await params;
  const district = decodeURIComponent(postcodeDistrict).trim().toUpperCase();
  const supabase = await createClient();
  const { data: trade } = await supabase.from("trade_categories").select("id, name, slug, default_monthly_price_pence").eq("slug", tradeSlug).eq("is_active", true).maybeSingle();
  if (!trade) notFound();

  const [{ data: availability }, company, intelligence, signalFeed] = await Promise.all([
    supabase.rpc("check_territory_availability", { p_postcode_district: district, p_trade_slug: trade.slug }),
    getCurrentCompany(),
    getTerritoryTradeIntelligence(district, trade.slug),
    getTerritoryTradeSignalFeed(district, trade.slug, 12),
  ]);
  const stats = Array.isArray(availability) ? availability[0] : availability;
  if (!stats) notFound();

  let hasConnectedCoverage = false;
  if (company && stats.territory_status !== "available") {
    const { data: ownClaim } = await supabase.from("territory_claims").select("id, territories!inner(postcode_district, trade_category_id)").eq("company_id", company.id).eq("territories.postcode_district", district).eq("territories.trade_category_id", trade.id).in("status", ["reserved", "active", "suspended"]).maybeSingle();
    hasConnectedCoverage = Boolean(ownClaim);
  }

  const status = STATUS_COPY[stats.territory_status] ?? STATUS_COPY.available;
  const localPrice = formatMonthlyGbp(COVERAGE_PLANS[0].monthlyPricePence);
  const total = intelligence?.total_opportunity_count ?? Number(stats.applications_last_30d ?? 0);
  const tradeValue = intelligence?.estimated_trade_value_gbp ?? Number(stats.estimated_trade_value_gbp ?? 0);

  return (
    <div className="min-w-0 space-y-8">
      <Link href="/territories" className="inline-flex items-center gap-2 text-sm font-semibold text-slate transition hover:text-charcoal">← Coverage Explorer</Link>
      <section className="overflow-hidden rounded-3xl border border-light-grey bg-charcoal text-white"><div className="flex flex-wrap items-start justify-between gap-5 p-6 sm:p-8"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Profile match preview</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{district} · {trade.name}</h1><p className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${status.className}`}><span className="h-2 w-2 rounded-full bg-current" />{status.label}</p></div><p className="text-3xl font-bold tracking-tight">{localPrice}<span className="text-sm font-normal text-white/50">/month Local</span></p></div><div className="grid gap-px bg-white/10 sm:grid-cols-3"><HeroMetric label="Live opportunity signals" value={String(total)} /><HeroMetric label="Indicative opportunity value" value={formatGbp(tradeValue)} /><HeroMetric label="Intelligence sources" value={String(countSources(intelligence))} /></div></section>

      <section><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">What is happening here?</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Combined signal preview</h2></div><p className="max-w-xl text-sm leading-6 text-slate sm:text-right">This location is one slice of the unified feed. The engine can combine planning, procurement, property and business-change evidence against your profile.</p></div><dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5"><SourceKpi label="Planning" value={intelligence?.planning_count ?? Number(stats.applications_last_30d ?? 0)} /><SourceKpi label="Tenders" value={intelligence?.tender_count ?? 0} /><SourceKpi label="Public pipeline" value={intelligence?.public_pipeline_count ?? 0} /><SourceKpi label="Contract awards" value={intelligence?.contract_award_count ?? 0} /><SourceKpi label="Commercial builds" value={intelligence?.commercial_development_count ?? 0} /></dl></section>

      <section>{hasConnectedCoverage ? <div className="rounded-3xl border border-success/20 bg-success/5 p-6"><p className="text-sm font-semibold text-charcoal">This location is connected to your coverage.</p><p className="mt-1 text-sm text-slate">Open the unified opportunity feed to review matched signals and decide which individual leads are worth a £20 unlock.</p><Link href="/opportunities" className="mt-4 inline-flex text-sm font-semibold text-success hover:underline">Open your opportunity feed →</Link></div> : <div className="rounded-3xl border border-signal-orange/20 bg-signal-orange/5 p-6"><p className="text-lg font-semibold text-charcoal">Want this geography in your coverage?</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate">Choose Local, Regional or Nationwide coverage. This preview is part of the shared marketplace, where each business can unlock relevant opportunities for £20.</p><Link href="/coverage" className="mt-5 inline-flex items-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Choose coverage</Link></div>}</section>

      <section><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Live opportunity shape</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">What the engine can see</h2></div><p className="max-w-xl text-sm leading-6 text-slate sm:text-right">Preview the signal before deciding whether an individual opportunity is worth unlocking for {LEAD_UNLOCK_PRICE_GBP}.</p></div>{signalFeed.length > 0 ? <ul className="mt-5 grid gap-3 lg:grid-cols-2">{signalFeed.map((item) => <li key={`${item.source_kind}:${item.source_record_id}`} className="rounded-2xl border border-light-grey bg-white p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-signal-orange">{SIGNAL_LABEL[item.source_kind] ?? humanize(item.source_kind)}</span><h3 className="mt-3 line-clamp-2 text-base font-semibold text-charcoal">{item.headline}</h3></div><span className="shrink-0 rounded-full bg-soft-surface px-2 py-1 text-[10px] font-semibold uppercase text-slate">{item.access_level === "full" ? "Available" : "Preview"}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">{item.stage && <span>{humanize(item.stage)}</span>}{item.deadline_at && <span>Deadline {new Date(item.deadline_at).toLocaleDateString("en-GB")}</span>}{item.buyer_name && item.access_level === "full" && <span>{item.buyer_name}</span>}</div><p className="mt-3 text-sm font-bold text-charcoal">Indicative value {formatGbpRange(item.estimated_trade_value_low, item.estimated_trade_value_high)}</p>{item.access_level === "full" ? <Link href={item.source_kind === "planning" ? `/opportunities/${item.source_record_id}` : `/opportunities/trade/${item.source_record_id}`} className="mt-4 inline-flex text-xs font-semibold text-signal-orange">Open opportunity →</Link> : <p className="mt-4 text-xs leading-5 text-slate">Unlock this opportunity for {LEAD_UNLOCK_PRICE_GBP} to reveal the complete company, evidence and contact view.</p>}</li>)}</ul> : <div className="mt-5 rounded-3xl border border-dashed border-light-grey bg-white p-8 text-center text-sm text-slate">No live signals are currently available in this location preview.</div>}</section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) { return <div className="bg-white/[0.04] p-5 sm:p-6"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>; }
function SourceKpi({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-light-grey bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt><dd className="mt-2 text-2xl font-bold text-charcoal">{value}</dd></div>; }
function countSources(value: Awaited<ReturnType<typeof getTerritoryTradeIntelligence>>) { if (!value) return 1; return [value.planning_count, value.tender_count, value.public_pipeline_count, value.contract_award_count, value.commercial_development_count].filter((count) => count > 0).length; }
function humanize(value: string | null | undefined) { return value ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—"; }
