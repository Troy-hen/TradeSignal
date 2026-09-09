"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Priority = {
  targetKey: string;
  title: string;
  reason: string;
  draftType: "none" | "letter" | "email";
  draftSubject: string | null;
  draftBody: string | null;
  href: string;
  kind: string;
  requiresApproval?: boolean;
};
type Brief = { headline: string; summary: string; priorities: Priority[]; generatedAt: string };

export function DailyTradeBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/assistant/daily-brief", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) {
          setError(data?.error === "assistant_not_configured" ? "Add OpenAI credit to activate your AI daily brief." : "Your daily brief could not be prepared just now.");
          return;
        }
        setBrief(data as Brief);
      })
      .catch(() => active && setError("Your daily brief could not be prepared just now."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) {
    return <section className="rounded-3xl bg-charcoal p-6 text-white"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">✦ MyTradeBox Daily</p><p className="mt-4 animate-pulse text-sm text-white/60">Reviewing your opportunities, deadlines and responses…</p></section>;
  }
  if (!brief) {
    return <section className="rounded-3xl border border-light-grey bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">✦ MyTradeBox Daily</p><h2 className="mt-3 text-xl font-bold text-charcoal">Your commercial briefing will appear here.</h2><p className="mt-2 text-sm leading-6 text-slate">{error ?? "MyTradeBox will rank the work that deserves attention and prepare draft outreach for your approval."}</p></section>;
  }

  const draftCount = brief.priorities.filter((item) => item.draftType !== "none" && item.draftBody).length;
  return (
    <section className="overflow-hidden rounded-3xl bg-charcoal text-white shadow-xl shadow-charcoal/10">
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">✦ MyTradeBox Daily</p><h2 className="mt-3 text-2xl font-bold tracking-tight">{brief.headline}</h2><p className="mt-3 text-sm leading-6 text-white/65">{brief.summary}</p></div>
          {draftCount > 0 && <span className="rounded-full border border-signal-orange/30 bg-signal-orange/10 px-3 py-1.5 text-xs font-semibold text-signal-orange">{draftCount} draft{draftCount === 1 ? "" : "s"} prepared for approval</span>}
        </div>
      </div>
      <div className="border-t border-white/10 bg-white/[0.025] p-4 sm:p-5">
        <ol className="space-y-3">
          {brief.priorities.map((item, index) => {
            const hasDraft = Boolean(item.draftBody && item.draftType !== "none");
            const isOpen = expanded === item.targetKey;
            return (
              <li key={`${item.targetKey}:${index}`} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-signal-orange text-xs font-bold text-white">{index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-white/55">{item.reason}</p><div className="mt-3 flex flex-wrap gap-3"><Link href={item.href} className="text-xs font-semibold text-signal-orange hover:text-white">Open opportunity →</Link>{hasDraft && <button type="button" onClick={() => setExpanded(isOpen ? null : item.targetKey)} className="text-xs font-semibold text-white/70 hover:text-white">{isOpen ? "Hide draft" : `Review ${item.draftType} draft`}</button>}</div></div>
                </div>
                {hasDraft && isOpen && <div className="mt-4 rounded-xl border border-white/10 bg-charcoal/60 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Prepared for approval · not sent</p>{item.draftSubject && <p className="mt-3 text-sm font-semibold text-white">Subject: {item.draftSubject}</p>}<p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-white/70">{item.draftBody}</p></div>}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-[10px] leading-4 text-white/35">Generated once per day from your live MyTradeBox workspace. Drafts are never sent without an explicit approval/send action.</p>
      </div>
    </section>
  );
}
