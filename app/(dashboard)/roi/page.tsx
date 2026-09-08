import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { formatGbp } from "@/components/opportunity-badge";

export default async function RoiPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const [{ data: matchStates }, { data: activeClaims }] = await Promise.all([
    supabase
      .from("lead_match_current_state")
      .select("application_trade_opportunity_id, current_action, current_contract_value_gbp")
      .eq("company_id", company.id),
    supabase.from("territory_claims").select("territory_id").eq("company_id", company.id).eq("status", "active"),
  ]);

  const oppIds = [
    ...new Set((matchStates ?? []).map((m) => m.application_trade_opportunity_id).filter((id): id is string => id !== null)),
  ];
  let opportunities: { id: string; estimated_trade_value_high: number | null }[] = [];
  if (oppIds.length > 0) {
    const { data } = await supabase.from("application_trade_opportunities").select("id, estimated_trade_value_high").in("id", oppIds);
    opportunities = data ?? [];
  }
  const oppValueById = new Map(opportunities.map((o) => [o.id, o.estimated_trade_value_high ?? 0]));

  let totalPipeline = 0;
  let totalQuoted = 0;
  let totalWon = 0;

  for (const m of matchStates ?? []) {
    if (!m.application_trade_opportunity_id) continue;
    const estimatedValue = oppValueById.get(m.application_trade_opportunity_id) ?? 0;
    if (m.current_action !== "won" && m.current_action !== "lost") totalPipeline += estimatedValue;
    if (m.current_action === "quoted") totalQuoted += m.current_contract_value_gbp ?? estimatedValue;
    if (m.current_action === "won") totalWon += m.current_contract_value_gbp ?? estimatedValue;
  }

  const territoryIds = [...new Set((activeClaims ?? []).map((c) => c.territory_id))];
  let monthlySpendPence = 0;
  if (territoryIds.length > 0) {
    const { data } = await supabase.from("territories").select("monthly_price_pence").in("id", territoryIds);
    monthlySpendPence = (data ?? []).reduce((sum, t) => sum + t.monthly_price_pence, 0);
  }
  const monthlySpendGbp = monthlySpendPence / 100;
  const roi = monthlySpendGbp > 0 ? totalWon / monthlySpendGbp : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal">ROI</h1>
      <p className="mt-2 text-slate">A simple view of what MyTradeBox is worth to your business.</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Kpi label="Pipeline value" value={formatGbp(totalPipeline)} />
        <Kpi label="Quoted" value={formatGbp(totalQuoted)} />
        <Kpi label="Won" value={formatGbp(totalWon)} />
        <Kpi label="Monthly spend" value={formatGbp(monthlySpendGbp)} />
        <Kpi label="Estimated ROI" value={roi !== null ? `${roi.toFixed(1)}×` : "—"} />
      </dl>
      <p className="mt-4 text-sm text-slate">
        Won figures use the contract value you record when marking an opportunity Won, falling back to its
        indicative estimate if no value was entered. Pipeline/quoted/won totals are estimates, not accounting
        records.
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-light-grey bg-white p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-charcoal">{value}</dd>
    </div>
  );
}
