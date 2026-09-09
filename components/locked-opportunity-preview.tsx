import { formatGbpRange } from "@/components/opportunity-badge";

export type OpportunityPreviewTeaser = {
  projectType?: string | null;
  status?: string | null;
  estimatedTradeValueLow?: number | null;
  estimatedTradeValueHigh?: number | null;
};

export function LockedOpportunityPreview({
  title = "See the opportunity shape",
  body = "Claim the territory to reveal projects, addresses, AI interpretation and contact timing.",
  compact = false,
  teaser,
}: {
  title?: string;
  body?: string;
  compact?: boolean;
  teaser?: OpportunityPreviewTeaser | null;
}) {
  const projectType = teaser?.projectType?.trim() || "Planning project";
  const status = formatStatus(teaser?.status);
  const tradeValue = formatGbpRange(teaser?.estimatedTradeValueLow, teaser?.estimatedTradeValueHigh);

  return (
    <div className={"overflow-hidden rounded-2xl border border-light-grey bg-white " + (compact ? "min-h-[210px]" : "min-h-[280px]")}>
      <div className={compact ? "p-4 sm:p-5" : "p-5 sm:p-6"}>
        <div className="rounded-xl border border-signal-orange/20 bg-signal-orange/[0.06] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-signal-orange">Project preview</p>
              <p className="mt-2 truncate text-base font-semibold text-charcoal">{projectType}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {status}
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-signal-orange/15 pt-3">
            <span className="text-xs text-slate">Estimated trade value</span>
            <span className="text-sm font-bold text-charcoal">{tradeValue}</span>
          </div>
        </div>

        <div aria-hidden="true" className="mt-3 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <PreviewField label="Property address" width="w-3/5" />
            <PreviewField label="Planning reference" width="w-4/5" />
          </div>
          <div className="rounded-xl border border-light-grey bg-soft-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate/60">Planning summary</p>
            <div className="mt-3 space-y-2 blur-[4px]">
              <div className="h-3 w-11/12 rounded-full bg-slate/30" />
              <div className="h-3 w-4/5 rounded-full bg-slate/20" />
              <div className="h-3 w-2/3 rounded-full bg-slate/20" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-light-grey p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate/60">Recommended action</p>
            <div className="h-3 w-20 rounded-full bg-slate/25 blur-[4px]" />
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-soft-surface px-4 py-3 text-center">
          <p className="text-xs font-semibold text-charcoal">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate">{body}</p>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, width }: { label: string; width: string }) {
  return (
    <div className="rounded-xl border border-light-grey p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate/60">{label}</p>
      <div className={"mt-3 h-3 rounded-full bg-slate/25 blur-[4px] " + width} />
    </div>
  );
}

function formatStatus(value: string | null | undefined): string {
  if (!value) return "Status available after claim";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
