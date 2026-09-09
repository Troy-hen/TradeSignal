import Link from "next/link";
import { formatGbpRange } from "@/components/opportunity-badge";
import type { OwnedMarketSignal } from "@/lib/data/trade-intelligence";

const LABELS: Record<string, string> = {
  tender: "Tender",
  public_pipeline: "Public pipeline",
  contract_award: "Contract award",
  commercial_development: "Commercial development",
};

export function MarketSignalRow({ item }: { item: OwnedMarketSignal }) {
  const label = LABELS[item.signal_type] ?? "Trade signal";
  return (
    <Link
      href={`/opportunities/trade/${item.market_signal_trade_match_id}`}
      className="block rounded-2xl border border-light-grey bg-white p-4 transition hover:border-signal-orange/35 hover:shadow-sm sm:p-5"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-signal-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-orange">{label}</span>
            {item.opportunity_bucket && <span className="rounded-full bg-soft-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{item.opportunity_bucket}</span>}
            <span className="text-xs font-medium text-slate">{item.postcode_district} · {item.trade_name}</span>
          </div>
          <h3 className="mt-2 truncate text-base font-semibold text-charcoal">{item.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
            {item.buyer_name && <span>Buyer: {item.buyer_name}</span>}
            {item.procurement_stage && <span>Stage: {humanize(item.procurement_stage)}</span>}
            {item.deadline_at && <span>Deadline: {new Date(item.deadline_at).toLocaleDateString("en-GB")}</span>}
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-sm font-bold text-charcoal">{formatGbpRange(item.estimated_trade_value_low, item.estimated_trade_value_high)}</p>
          <p className="mt-1 text-xs font-semibold text-signal-orange">Open opportunity →</p>
        </div>
      </div>
    </Link>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
