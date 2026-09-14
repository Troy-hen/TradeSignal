import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { formatGbp } from "@/components/opportunity-badge";
import { PRODUCT_BRAND } from "@/lib/product/brand";
import { AppPageHeader } from "@/components/app-page-header";

export default async function RoiPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const [{ data: matchStates }, { data: activeClaims }] = await Promise.all([
    supabase.from("lead_match_current_state").select("application_trade_opportunity_id, current_action, current_contract_value_gbp").eq("company_id", company.id),
    supabase.from("territory_claims").select("territory_id").eq("company_id", company.id).eq("status", "active"),
  ]);

  const oppIds = [...new Set((matchStates ?? []).map((match) => match.application_trade_opportunity_id).filter((id): id is string => id !== null))];
  let opportunities: { id: string; estimated_trade_value_high: number | null }[] = [];
  if (oppIds.length > 0) {
    const { data } = await supabase.from("application_trade_opportunities").select("id, estimated_trade_value_high").in("id", oppIds);
    opportunities = data ?? [];
  }
  const valueById = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity.estimated_trade_value_high ?? 0]));

  let totalPipeline = 0;
  let totalQuoted = 0;
  let totalWon = 0;
  for (const match of matchStates ?? []) {
    if (!match.application_trade_opportunity_id) continue;
    const estimatedValue = valueById.get(match.application_trade_opportunity_id) ?? 0;
    if (match.current_action !== "won" && match.current_action !== "lost") totalPipeline += estimatedValue;
    if (match.current_action === "quoted") totalQuoted += match.current_contract_value_gbp ?? estimatedValue;
    if (match.current_action === "won") totalWon += match.current_contract_value_gbp ?? estimatedValue;
  }

  const territoryIds = [...new Set((activeClaims ?? []).map((claim) => claim.territory_id))];
  let monthlySpendPence = 0;
  if (territoryIds.length > 0) {
    const { data } = await supabase.from("territories").select("monthly_price_pence").in("id", territoryIds);
    monthlySpendPence = (data ?? []).reduce((sum, territory) => sum + territory.monthly_price_pence, 0);
  }
  const monthlySpendGbp = monthlySpendPence / 100;
  const roi = monthlySpendGbp > 0 ? totalWon / monthlySpendGbp : null;

  return (
    <div className="space-y-8">
      <AppPageHeader eyebrow="Business case" title="Your return on signal." description={"A simple view of what " + PRODUCT_BRAND.shortName + " is worth to " + company.trading_name + "."} actions={<a href="/api/roi/pdf" className="inline-flex rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange">Download ROI PDF ↓</a>} />

      <section className="rounded-3xl bg-charcoal p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Estimated pipeline</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><p className="text-4xl font-bold tracking-tight sm:text-5xl">{formatGbp(totalPipeline)}</p><p className="max-w-md text-sm leading-6 text-white/55 sm:text-right">Open opportunity value across your active coverage</p></div>
      </section>

      <dl className="grid grid-cols-2 gap-4 xl:grid-cols-4"><Kpi label="Quoted" value={formatGbp(totalQuoted)} accent /><Kpi label="Won" value={formatGbp(totalWon)} /><Kpi label="Monthly spend" value={formatGbp(monthlySpendGbp)} /><Kpi label="Estimated ROI" value={roi !== null ? roi.toFixed(1) + "×" : "—"} accent /></dl>

      <section className="rounded-2xl border border-light-grey bg-white px-5 py-4"><p className="max-w-3xl text-sm leading-6 text-slate">Won figures use the contract value recorded when an opportunity is marked Won, falling back to its indicative estimate when no value was entered. Pipeline, quoted and won totals are estimates, not accounting records.</p></section>
    </div>
  );
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={accent ? "rounded-2xl border border-signal-orange/15 bg-signal-orange/[0.04] p-5" : "rounded-2xl border border-light-grey bg-white p-5"}><dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate">{label}</dt><dd className="mt-3 break-words text-2xl font-bold tracking-tight text-charcoal">{value}</dd></div>;
}
