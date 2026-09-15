import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { formatGbp } from "@/components/opportunity-badge";
import { PRODUCT_BRAND } from "@/lib/product/brand";
import { AppPageHeader } from "@/components/app-page-header";
import { listPaidLeadUnlocks } from "@/lib/data/lead-unlocks";
import { getMarketSignalForLeadUnlock } from "@/lib/data/trade-intelligence";

type RecordRow = { id: string; source: string; category: string; stage: string; score: number | null; value: number; contractValue: number | null };

export default async function RoiPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const unlocks = await listPaidLeadUnlocks(company.id);
  const [{ data: matchStates }, { data: marketStates }, { data: activeClaims }] = await Promise.all([
    supabase.from("lead_match_current_state").select("application_trade_opportunity_id, current_action, current_contract_value_gbp").eq("company_id", company.id),
    supabase.from("market_signal_company_states").select("market_signal_trade_match_id, current_action, contract_value_gbp").eq("company_id", company.id),
    supabase.from("territory_claims").select("territory_id").eq("company_id", company.id).eq("status", "active"),
  ]);

  const planningIds = unlocks.map((unlock) => unlock.application_trade_opportunity_id).filter((id): id is string => Boolean(id));
  const marketIds = unlocks.map((unlock) => unlock.market_signal_trade_match_id).filter((id): id is string => Boolean(id));
  const [{ data: opportunities }, marketDetails] = await Promise.all([
    planningIds.length ? supabase.from("application_trade_opportunities").select("id, trade_category_id, estimated_trade_value_high, opportunity_score").in("id", planningIds) : Promise.resolve({ data: [] }),
    Promise.all(marketIds.map((id) => getMarketSignalForLeadUnlock(id))),
  ]);
  const categoryIds = [...new Set((opportunities ?? []).map((row) => row.trade_category_id).filter((id): id is string => Boolean(id)))];
  const { data: categories } = categoryIds.length ? await supabase.from("trade_categories").select("id, name").in("id", categoryIds) : { data: [] };
  const categoryById = new Map((categories ?? []).map((row) => [row.id, row.name]));
  const oppById = new Map((opportunities ?? []).map((row) => [row.id, row]));
  const planningStateById = new Map((matchStates ?? []).map((row) => [row.application_trade_opportunity_id, row]));
  const marketStateById = new Map((marketStates ?? []).map((row) => [row.market_signal_trade_match_id, row]));
  const marketById = new Map(marketDetails.filter(Boolean).map((row) => [row!.market_signal_trade_match_id, row!]));

  const records: RecordRow[] = [];
  for (const unlock of unlocks) {
    if (unlock.application_trade_opportunity_id) {
      const opportunity = oppById.get(unlock.application_trade_opportunity_id);
      if (!opportunity) continue;
      const state = planningStateById.get(unlock.application_trade_opportunity_id);
      records.push({ id: unlock.id, source: "Planning", category: categoryById.get(opportunity.trade_category_id) ?? "Business opportunity", stage: state?.current_action ?? "unlocked", score: opportunity.opportunity_score, value: Number(opportunity.estimated_trade_value_high ?? 0), contractValue: state?.current_contract_value_gbp ?? null });
    } else if (unlock.market_signal_trade_match_id) {
      const signal = marketById.get(unlock.market_signal_trade_match_id);
      if (!signal) continue;
      const state = marketStateById.get(unlock.market_signal_trade_match_id);
      records.push({ id: unlock.id, source: humanize(signal.source), category: signal.trade_name, stage: state?.current_action ?? "unlocked", score: signal.fit_score, value: Number(signal.estimated_trade_value_high ?? 0), contractValue: state?.contract_value_gbp ?? null });
    }
  }

  const counts = countStages(records);
  const totalPipeline = records.filter((row) => !["won", "lost"].includes(row.stage)).reduce((sum, row) => sum + row.value, 0);
  const quotedValue = records.filter((row) => row.stage === "quoted").reduce((sum, row) => sum + (row.contractValue ?? row.value), 0);
  const wonValue = records.filter((row) => row.stage === "won").reduce((sum, row) => sum + (row.contractValue ?? row.value), 0);
  const territoryIds = [...new Set((activeClaims ?? []).map((claim) => claim.territory_id))];
  let monthlySpendPence = 0;
  if (territoryIds.length > 0) {
    const { data } = await supabase.from("territories").select("monthly_price_pence").in("id", territoryIds);
    monthlySpendPence = (data ?? []).reduce((sum, territory) => sum + territory.monthly_price_pence, 0);
  }
  const unlockSpend = unlocks.reduce((sum, unlock) => sum + (unlock.is_trial_credit ? 0 : Number(unlock.amount_pence ?? 0)), 0) / 100;
  const totalSpend = monthlySpendPence / 100 + unlockSpend;
  const roi = totalSpend > 0 ? wonValue / totalSpend : null;
  const performance = groupPerformance(records);

  return (
    <div className="space-y-8">
      <AppPageHeader eyebrow="Performance intelligence" title="Insights that improve buying decisions." description={`Track what your unlocked leads do next, what converts and where ${PRODUCT_BRAND.shortName} is paying back.`} actions={<a href="/api/roi/pdf" className="inline-flex rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange">Download report ↓</a>} stats={[{ label: "Unlocked", value: String(records.length), detail: "Purchased lead records" }, { label: "Won", value: String(counts.won), detail: "Marked won" }, { label: "Contacted", value: String(counts.contacted), detail: "Reached or in conversation" }]} />
      <section className="rounded-3xl bg-charcoal p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Open pipeline</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><p className="text-4xl font-bold tracking-tight sm:text-5xl">{formatGbp(totalPipeline)}</p><p className="max-w-md text-sm leading-6 text-white/55 sm:text-right">Indicative value across purchased leads that are not marked Won or Lost.</p></div></section>
      <dl className="grid grid-cols-2 gap-4 xl:grid-cols-6"><Kpi label="Unlocked" value={String(records.length)} accent /><Kpi label="Contacted" value={String(counts.contacted)} /><Kpi label="Quoted" value={String(counts.quoted)} /><Kpi label="Won" value={String(counts.won)} /><Kpi label="Won value" value={formatGbp(wonValue)} /><Kpi label="ROI" value={roi !== null ? `${roi.toFixed(1)}×` : "—"} accent /></dl>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]"><div className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Conversion funnel</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">From unlock to outcome.</h2><div className="mt-6 grid gap-3 sm:grid-cols-5">{[["Unlocked", counts.unlocked], ["Contacted", counts.contacted], ["Quoted", counts.quoted], ["Won", counts.won], ["Lost", counts.lost]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-soft-surface p-4"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-2 text-2xl font-bold text-charcoal">{value}</p></div>)}</div><p className="mt-5 text-xs leading-5 text-slate">Conversion is based on the latest stage recorded in the lead workspace. It is operational reporting, not an accounting statement.</p></div><div className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.04] p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Commercial view</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">What the spend says.</h2><dl className="mt-5 grid gap-4 border-t border-signal-orange/15 pt-5"><Mini label="Quoted value" value={formatGbp(quotedValue)} /><Mini label="Platform fee" value={formatGbp(monthlySpendPence / 100)} /><Mini label="Lead unlock spend" value={formatGbp(unlockSpend)} /><Mini label="Total recorded spend" value={formatGbp(totalSpend)} /></dl></div></section>
      <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Buying insight</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Performance by signal source and category.</h2></div><p className="text-xs text-slate">Sorted by purchased volume</p></div>{performance.length > 0 ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="border-b border-light-grey text-[10px] font-bold uppercase tracking-[0.1em] text-slate"><tr><th className="px-3 py-3">Source / category</th><th className="px-3 py-3">Unlocked</th><th className="px-3 py-3">Contacted</th><th className="px-3 py-3">Quoted</th><th className="px-3 py-3">Won</th><th className="px-3 py-3">Win rate</th></tr></thead><tbody className="divide-y divide-light-grey">{performance.map((row) => <tr key={row.key} className="text-sm"><td className="px-3 py-3 font-semibold text-charcoal">{row.key}</td><td className="px-3 py-3 text-slate">{row.unlocked}</td><td className="px-3 py-3 text-slate">{row.contacted}</td><td className="px-3 py-3 text-slate">{row.quoted}</td><td className="px-3 py-3 font-semibold text-charcoal">{row.won}</td><td className="px-3 py-3 font-semibold text-signal-orange">{row.unlocked ? `${Math.round((row.won / row.unlocked) * 100)}%` : "—"}</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-2xl bg-soft-surface p-4 text-sm text-slate">Unlock and update your first lead to start building buying insight.</p>}</section>
      <section className="rounded-2xl border border-light-grey bg-white px-5 py-4"><p className="max-w-4xl text-sm leading-6 text-slate">Won figures use the contract value recorded in the lead workspace, falling back to the indicative opportunity value when no value is entered. Pipeline and ROI are directional decision support; they are not accounting records.</p></section>
    </div>
  );
}

function countStages(records: RecordRow[]) { return records.reduce((counts, row) => { counts.unlocked += 1; if (["contacted", "quoted", "won", "lost"].includes(row.stage)) counts.contacted += 1; if (["quoted", "won"].includes(row.stage)) counts.quoted += 1; if (row.stage === "won") counts.won += 1; if (row.stage === "lost") counts.lost += 1; return counts; }, { unlocked: 0, contacted: 0, quoted: 0, won: 0, lost: 0 }); }
function groupPerformance(records: RecordRow[]) { const groups = new Map<string, { key: string; unlocked: number; contacted: number; quoted: number; won: number }>(); for (const row of records) { const key = `${row.source} · ${row.category}`; const group = groups.get(key) ?? { key, unlocked: 0, contacted: 0, quoted: 0, won: 0 }; group.unlocked += 1; if (["contacted", "quoted", "won", "lost"].includes(row.stage)) group.contacted += 1; if (["quoted", "won"].includes(row.stage)) group.quoted += 1; if (row.stage === "won") group.won += 1; groups.set(key, group); } return [...groups.values()].sort((a, b) => b.unlocked - a.unlocked); }
function humanize(value: string) { return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={accent ? "rounded-2xl border border-signal-orange/15 bg-signal-orange/[0.04] p-5" : "rounded-2xl border border-light-grey bg-white p-5"}><dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate">{label}</dt><dd className="mt-3 break-words text-2xl font-bold tracking-tight text-charcoal">{value}</dd></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 text-sm"><dt className="text-slate">{label}</dt><dd className="font-bold text-charcoal">{value}</dd></div>; }
