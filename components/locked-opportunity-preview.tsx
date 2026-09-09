export function LockedOpportunityPreview({
  title = "See the opportunity shape",
  body = "Claim the territory to reveal projects, addresses, AI interpretation and contact timing.",
  compact = false,
}: {
  title?: string;
  body?: string;
  compact?: boolean;
}) {
  return (
    <div className={"relative overflow-hidden rounded-2xl border border-light-grey bg-white " + (compact ? "min-h-[190px]" : "min-h-[240px]")}>
      <div aria-hidden="true" className={"grid gap-3 p-5 " + (compact ? "sm:p-6" : "sm:p-8")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewField label="Project type" width="w-4/5" />
          <PreviewField label="Property address" width="w-3/5" />
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

      <div className="absolute inset-0 flex items-center justify-center bg-white/68 px-5 text-center backdrop-blur-[2px]">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-charcoal">{title}</p>
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
