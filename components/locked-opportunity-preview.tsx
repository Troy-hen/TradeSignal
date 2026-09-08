export function LockedOpportunityPreview({
  title = "Opportunity details locked",
  body = "Claim the territory to reveal projects, addresses, AI interpretation and contact timing.",
  compact = false,
}: {
  title?: string;
  body?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border border-light-grey bg-white " +
        (compact ? "min-h-[170px]" : "min-h-[220px]")
      }
    >
      <div aria-hidden="true" className={"space-y-3 p-5 opacity-35 " + (compact ? "sm:p-6" : "sm:p-8")}>
        <div className="h-3 w-2/5 rounded-full bg-slate/25" />
        <div className="h-8 w-3/5 rounded-xl bg-slate/20" />
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="h-16 rounded-xl bg-soft-surface" />
          <div className="h-16 rounded-xl bg-soft-surface" />
          <div className="h-16 rounded-xl bg-soft-surface" />
        </div>
        <div className="h-3 w-4/5 rounded-full bg-slate/20" />
        <div className="h-3 w-3/5 rounded-full bg-slate/15" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-white/80 px-5 text-center backdrop-blur-[3px]">
        <div className="max-w-md">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-charcoal text-white" aria-hidden="true">
            <LockIcon />
          </span>
          <p className="mt-3 text-sm font-semibold text-charcoal">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate">{body}</p>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
