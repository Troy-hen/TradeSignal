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

export function OpportunityRow({ item }: { item: OpportunityListItem }) {
  return (
    <Link
      href={`/opportunities/${item.opportunityId}`}
      className="block rounded-md border border-light-grey bg-white p-4 transition hover:border-signal-orange"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <OpportunityBadge bucket={item.bucket} score={item.score} />
          <span className="font-medium text-charcoal">{item.projectType ?? "Planning application"}</span>
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-slate">
          {item.currentAction ? (ACTION_LABELS[item.currentAction] ?? item.currentAction) : "New"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
        <span>
          {item.district} · {item.tradeName}
        </span>
        <span>Est. trade value: {formatGbpRange(item.valueLow, item.valueHigh)}</span>
        <span className="capitalize">{item.planningStatus.replace(/_/g, " ")}</span>
      </div>
    </Link>
  );
}
