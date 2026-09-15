import Link from "next/link";
import { CrmPushAction } from "@/components/crm-push-action";
import { formatGbpRange } from "@/components/opportunity-badge";
import type { CrmConnection } from "@/lib/data/crm";

export type PurchasedLeadTableRow = {
  unlockId: string;
  href: string;
  title: string;
  source: string;
  location: string;
  stage: string;
  score: number | null;
  valueLow: number | null;
  valueHigh: number | null;
  updatedAt: string | null;
  crmStatus?: string | null;
};

export function PurchasedLeadTable({ rows, connections }: { rows: PurchasedLeadTableRow[]; connections: CrmConnection[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-light-grey bg-white">
      <div className="flex flex-col gap-2 border-b border-light-grey px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Lead workspace</p><h2 className="mt-1 text-xl font-bold tracking-tight text-charcoal">Purchased leads, ready to work.</h2><p className="mt-1 text-sm text-slate">Update the stage in each brief, then send the record to your configured CRM.</p></div>
        <span className="text-xs font-semibold text-slate">{rows.length} record{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] text-left">
          <thead className="bg-soft-surface"><tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate"><th className="px-5 py-3">Lead</th><th className="px-4 py-3">Source / area</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Fit</th><th className="px-4 py-3">Indicative value</th><th className="px-4 py-3">CRM</th><th className="px-5 py-3 text-right">Open</th></tr></thead>
          <tbody className="divide-y divide-light-grey">
            {rows.map((row) => <tr key={row.unlockId} className="align-middle"><td className="max-w-[280px] px-5 py-4"><Link href={row.href} className="line-clamp-2 text-sm font-semibold text-charcoal hover:text-signal-orange">{row.title}</Link><p className="mt-1 text-xs text-slate">{row.updatedAt ? `Unlocked ${new Date(row.updatedAt).toLocaleDateString("en-GB")}` : "Purchased lead"}</p></td><td className="px-4 py-4"><p className="text-xs font-semibold text-charcoal">{row.source}</p><p className="mt-1 text-xs text-slate">{row.location}</p></td><td className="px-4 py-4"><span className="rounded-full bg-soft-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate">{humanize(row.stage)}</span></td><td className="px-4 py-4 text-sm font-bold text-charcoal">{row.score !== null ? `${Math.round(row.score)}/100` : "—"}</td><td className="px-4 py-4 text-sm font-semibold text-charcoal">{formatGbpRange(row.valueLow, row.valueHigh)}</td><td className="px-4 py-4"><div className="flex flex-col items-start gap-2"><span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${row.crmStatus === "sent" ? "text-success" : row.crmStatus === "failed" ? "text-danger" : "text-slate"}`}>{row.crmStatus ? humanize(row.crmStatus) : "Not sent"}</span><CrmPushAction compact leadUnlockId={row.unlockId} connections={connections} /></div></td><td className="px-5 py-4 text-right"><Link href={row.href} className="text-sm font-semibold text-signal-orange hover:underline">Open →</Link></td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-light-grey md:hidden">
        {rows.map((row) => <article key={row.unlockId} className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={row.href} className="line-clamp-2 text-sm font-semibold text-charcoal hover:text-signal-orange">{row.title}</Link><p className="mt-1 text-xs text-slate">{row.source} · {row.location}</p></div><span className="shrink-0 rounded-full bg-soft-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate">{humanize(row.stage)}</span></div><div className="grid grid-cols-3 gap-3 text-xs"><div><p className="text-slate">Fit</p><p className="mt-1 font-bold text-charcoal">{row.score !== null ? `${Math.round(row.score)}/100` : "—"}</p></div><div><p className="text-slate">Value</p><p className="mt-1 font-bold text-charcoal">{formatGbpRange(row.valueLow, row.valueHigh)}</p></div><div><p className="text-slate">CRM</p><p className={`mt-1 font-bold ${row.crmStatus === "sent" ? "text-success" : "text-charcoal"}`}>{row.crmStatus ? humanize(row.crmStatus) : "Not sent"}</p></div></div><div className="flex flex-wrap gap-2"><Link href={row.href} className="inline-flex rounded-xl bg-charcoal px-3 py-2 text-xs font-semibold text-white">Open brief →</Link><CrmPushAction compact leadUnlockId={row.unlockId} connections={connections} /></div></article>)}
      </div>
    </section>
  );
}

function humanize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
