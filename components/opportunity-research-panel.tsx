"use client";

import { useState } from "react";

type ResearchReport = {
  id: string;
  status: string;
  summary: string | null;
  report: {
    executiveSummary?: string;
    commercialAssessment?: string;
    whoToApproach?: string;
    timing?: string;
    relationshipSignal?: string;
    risks?: string[];
    nextActions?: string[];
    externalFindings?: string[];
  };
  sources: Array<{ title?: string; url?: string }>;
  generated_at: string | null;
  expires_at: string | null;
};

export function OpportunityResearchPanel({ opportunityId, initialReport }: { opportunityId: string; initialReport: ResearchReport | null }) {
  const [report, setReport] = useState<ResearchReport | null>(initialReport);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function research() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/research`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error === "assistant_not_configured" ? "Deep Research needs a working AI provider." : "Research could not be completed just now.");
        return;
      }
      setReport(data.report ?? null);
    } catch {
      setError("Research could not connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-light-grey bg-white">
      <div className="flex flex-col gap-4 bg-charcoal p-5 text-white sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Deep Research</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight">Turn the planning record into a commercial brief.</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">Combines the unlocked opportunity, MyTradeBox relationship intelligence, product knowledge and useful public-web context. Reports are saved so they are not regenerated on every page load.</p>
        </div>
        <button type="button" onClick={() => void research()} disabled={pending} className="shrink-0 rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:opacity-60">
          {pending ? "Researching…" : report ? "Refresh research" : "Research deeper"}
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {error && <p className="rounded-2xl border border-danger/20 bg-danger/[0.03] p-4 text-sm text-danger">{error}</p>}
        {!report && !error && !pending && <p className="text-sm leading-6 text-slate">Run this only when the opportunity is commercially interesting. The result focuses on who is involved, timing, relationship signals, risks and the next best actions.</p>}
        {pending && <div className="flex items-center gap-3 rounded-2xl bg-soft-surface p-4 text-sm text-slate"><span className="animate-pulse text-signal-orange">✦</span> Checking the opportunity, related activity and public context…</div>}
        {report && !pending && <ResearchBody report={report} />}
      </div>
    </section>
  );
}

function ResearchBody({ report }: { report: ResearchReport }) {
  const data = report.report ?? {};
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate">Saved commercial research</p>
          {report.generated_at && <p className="text-xs text-slate">Updated {new Date(report.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
        </div>
        <p className="mt-2 text-base font-semibold leading-7 text-charcoal">{data.executiveSummary ?? report.summary}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Insight label="Commercial assessment" value={data.commercialAssessment} />
        <Insight label="Who to approach" value={data.whoToApproach} />
        <Insight label="Timing" value={data.timing} />
        <Insight label="Relationship signal" value={data.relationshipSignal} />
      </div>

      {(data.nextActions?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-signal-orange/20 bg-signal-orange/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-signal-orange">Recommended next actions</p>
          <ol className="mt-3 space-y-2">
            {data.nextActions!.map((item, index) => <li key={index} className="flex gap-3 text-sm leading-6 text-charcoal"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal-orange text-xs font-bold text-white">{index + 1}</span><span>{item}</span></li>)}
          </ol>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ListBlock title="Risks / watch-outs" items={data.risks ?? []} />
        <ListBlock title="Public research findings" items={data.externalFindings ?? []} />
      </div>

      {report.sources?.length > 0 && (
        <div className="border-t border-light-grey pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Sources</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.sources.filter((source) => source.url).map((source, index) => (
              <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="rounded-xl border border-light-grey px-3 py-2 text-xs font-semibold text-charcoal hover:border-signal-orange/40">
                {source.title || "Source"} ↗
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Insight({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-2xl border border-light-grey bg-soft-surface p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate">{label}</p><p className="mt-2 text-sm leading-6 text-charcoal">{value || "No additional signal found."}</p></div>;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-light-grey p-4"><p className="text-sm font-semibold text-charcoal">{title}</p>{items.length ? <ul className="mt-3 space-y-2">{items.map((item, index) => <li key={index} className="flex items-start gap-2 text-sm leading-6 text-slate"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-orange" /><span>{item}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate">Nothing material identified.</p>}</div>;
}
