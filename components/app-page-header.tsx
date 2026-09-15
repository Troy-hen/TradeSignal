import type { ReactNode } from "react";

type PageStat = { label: string; value: string; detail?: string };

export function AppPageHeader({ eyebrow, title, description, actions, stats }: { eyebrow: string; title: string; description: string; actions?: ReactNode; stats?: PageStat[] }) {
  return (
    <section className="rounded-[2rem] border border-light-grey bg-white p-6 shadow-[0_14px_45px_rgba(31,41,55,0.045)] sm:p-8">
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">{eyebrow}</p>
          <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {stats && stats.length > 0 ? <div className="mt-7 grid gap-3 border-t border-light-grey pt-5 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-light-grey bg-soft-surface p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">{stat.label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-charcoal">{stat.value}</p>{stat.detail ? <p className="mt-1 text-xs leading-5 text-slate">{stat.detail}</p> : null}</div>)}</div> : null}
    </section>
  );
}
