import Link from "next/link";
import { OpportunityBadge, formatGbpRange } from "@/components/opportunity-badge";
import type { OpportunityListItem } from "@/lib/data/opportunities";

const ACTION_LABELS: Record<string, string> = {
  viewed: "Viewed",
  saved: "Saved",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function OpportunityRow({ item }: { item: OpportunityListItem }) {
  return (
    <Link
      href={`/opportunities/${item.opportunityId}`}
      className="group block rounded-2xl border border-light-grey bg-white p-4 transition hover:-translate-y-0.5 hover:border-signal-orange/40 hover:shadow-[0_12px_32px_rgba(31,41,55,0.08)] sm:p-5"
    >
      <div className="flex items-start gap-4">
        <OpportunityBadge bucket={item.bucket} score={item.score} variant="tile" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">
                {item.tradeName} · {item.district}
              </p>
              <h3 className="mt-1 truncate text-base font-semibold tracking-tight text-charcoal sm:text-lg">
                {item.projectType ?? "Planning application"}
              </h3>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                item.currentAction ? "bg-soft-surface text-slate" : "bg-signal-orange/10 text-signal-orange"
              }`}
            >
              {item.currentAction ? ACTION_LABELS[item.currentAction] ?? item.currentAction : "New"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate">
            <span>{formatStatus(item.planningStatus)}</span>
            {item.receivedDate && <span>Received {item.receivedDate}</span>}
            <span>Matched to your territory</span>
          </div>

          {item.summary && (
            <div className="mt-3 flex gap-2 rounded-xl bg-soft-surface px-3 py-2.5">
              <span className="mt-0.5 text-signal-orange" aria-hidden="true">✦</span>
              <p className="line-clamp-2 text-xs leading-5 text-slate">
                <span className="font-semibold text-charcoal">AI read: </span>{item.summary}
              </p>
            </div>
          )}

          {item.recommendedAction && (
            <p className="mt-3 truncate text-xs text-slate">
              <span className="font-semibold text-charcoal">Recommended next move: </span>{item.recommendedAction}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-light-grey pt-3">
            <span className="text-xs text-slate">
              Est. trade value <strong className="ml-1 text-sm text-charcoal">{formatGbpRange(item.valueLow, item.valueHigh)}</strong>
            </span>
            <span className="text-xs font-semibold text-signal-orange transition group-hover:text-[#e95f00]">Open brief →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
