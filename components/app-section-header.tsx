import type { ReactNode } from "react";

export function AppSectionHeader({
  eyebrow,
  title,
  description,
  action,
  meta,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-4 rounded-2xl border border-light-grey bg-white px-5 py-4 shadow-[0_8px_30px_rgba(31,41,55,0.035)] sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-signal-orange">{eyebrow}</p>
        <h2 className="mt-1.5 text-xl font-bold tracking-tight text-charcoal sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate">{description}</p> : null}
      </div>
      {action || meta ? <div className="flex shrink-0 items-center gap-3">{meta}{action}</div> : null}
    </div>
  );
}
