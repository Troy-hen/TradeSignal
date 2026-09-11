"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type OpportunityResult = {
  result_kind?: "planning" | "market_signal";
  opportunity_id: string;
  total_matches: number;
  postcode_district: string;
  post_town: string | null;
  trade_name: string;
  trade_slug: string;
  project_type: string | null;
  planning_status: string;
  estimated_trade_value_low: number | null;
  estimated_trade_value_high: number | null;
  access_level: "full" | "teaser";
  opportunity_score: number | null;
  opportunity_bucket: string | null;
  summary: string | null;
  recommended_action: string | null;
  coverage_status: string;
  monthly_price_pence: number;
  deadline_at?: string | null;
  buyer_name?: string | null;
};
type AssistantResponse = { answer?: string; opportunities?: OpportunityResult[]; error?: string };

const STARTERS = [
  "What are the strongest opportunities for my profile?",
  "Show me hospitality openings that may need EPOS or broadband near Norwich",
  "What buying signals should an accountancy firm act on?",
  "Why is this opportunity relevant to what I sell?",
];

export function AskTradeSignal({ notificationBarVisible = false }: { notificationBarVisible?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityResult[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }, [open, messages, opportunities]);

  async function send(messageOverride?: string) {
    const text = (messageOverride ?? input).trim();
    if (!text || pending) return;
    const nextHistory = [...messages, { role: "user" as const, content: text }];
    setMessages(nextHistory);
    setInput("");
    setOpportunities([]);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: messages.slice(-10), contextPath: pathname }) });
      const data = await response.json().catch(() => ({})) as AssistantResponse;
      if (!response.ok) {
        setError(data.error === "assistant_not_configured" ? "The intelligence assistant needs an active AI provider before it can answer." : "The intelligence assistant could not answer that just now.");
        return;
      }
      setMessages([...nextHistory, { role: "assistant", content: data.answer ?? "I could not find enough grounded information to answer that." }]);
      setOpportunities(data.opportunities ?? []);
    } catch {
      setError("The intelligence assistant could not connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className={["fixed right-4 z-40 inline-flex items-center gap-2 rounded-2xl bg-charcoal px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-signal-orange sm:right-6", notificationBarVisible ? "bottom-28 md:bottom-24" : "bottom-5"].join(" ")} aria-label="Ask TradeSignal"><span className="text-signal-orange" aria-hidden="true">✦</span><span className="hidden sm:inline">Ask TradeSignal</span><span className="sm:hidden">Ask</span></button>
    {open && <>
      <button type="button" aria-label="Close Ask TradeSignal" onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-[1px]" />
      <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[520px] flex-col bg-white shadow-2xl sm:border-l sm:border-light-grey" aria-label="Ask TradeSignal assistant">
        <header className="flex items-start justify-between gap-4 border-b border-light-grey px-5 py-5 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity intelligence</p><h2 className="mt-1 text-xl font-bold tracking-tight text-charcoal">Ask TradeSignal</h2><p className="mt-1 text-xs leading-5 text-slate">Ask about buying signals, likely needs, timing and next actions across your marketplace.</p></div><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate hover:bg-soft-surface hover:text-charcoal" aria-label="Close assistant">×</button></header>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{messages.length === 0 ? <div><div className="rounded-3xl bg-charcoal p-5 text-white"><p className="text-sm font-semibold">Ask what is changing, who may need something and what to do next.</p><p className="mt-2 text-sm leading-6 text-white/60">Answers combine normalised signals from planning, public and commercial sources with your supplier profile and workspace context.</p></div><div className="mt-5 grid gap-2">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => void send(starter)} className="rounded-2xl border border-light-grey bg-white px-4 py-3 text-left text-sm font-medium text-charcoal transition hover:border-signal-orange/40 hover:bg-signal-orange/[0.02]">{starter}<span className="float-right text-signal-orange">→</span></button>)}</div></div> : <div className="space-y-4">{messages.map((message, index) => <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}><div className={message.role === "user" ? "max-w-[88%] rounded-2xl rounded-br-md bg-charcoal px-4 py-3 text-sm leading-6 text-white" : "max-w-[94%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-soft-surface px-4 py-3 text-sm leading-6 text-charcoal"}>{message.content}</div></div>)}{pending && <div className="inline-flex items-center gap-2 rounded-2xl bg-soft-surface px-4 py-3 text-sm text-slate"><span className="animate-pulse text-signal-orange">✦</span> Checking the opportunity engine…</div>}{error && <p className="rounded-2xl border border-danger/20 bg-danger/[0.03] p-4 text-sm text-danger">{error}</p>}{opportunities.length > 0 && <div className="space-y-3 border-t border-light-grey pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate">Relevant results</p>{opportunities.map((item) => <AssistantOpportunityCard key={`${item.result_kind ?? "planning"}:${item.opportunity_id}`} item={item} />)}</div>}</div>}</div>
        <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="border-t border-light-grey bg-white p-4 sm:p-5"><div className="flex items-end gap-2 rounded-2xl border border-light-grey bg-white p-2 focus-within:border-signal-orange/50 focus-within:ring-2 focus-within:ring-signal-orange/10"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Ask about an opportunity, need or buying window…" rows={2} className="max-h-32 min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-charcoal outline-none placeholder:text-slate/60" /><button type="submit" disabled={!input.trim() || pending} className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-signal-orange px-4 text-sm font-semibold text-white disabled:opacity-40">Send</button></div><p className="mt-2 text-[10px] leading-4 text-slate">Answers are grounded in the data your workspace can access. Full company and contact detail remains behind the individual £20 unlock.</p></form>
      </aside>
    </>}
  </>;
}

function AssistantOpportunityCard({ item }: { item: OpportunityResult }) {
  const owned = item.access_level === "full";
  const isMarket = item.result_kind === "market_signal";
  const destination = owned ? (isMarket ? `/opportunities/trade/${item.opportunity_id}` : `/opportunities/${item.opportunity_id}`) : isMarket ? "/opportunities" : `/opportunities/${item.opportunity_id}`;
  const score = item.opportunity_score === null ? "—" : `${Math.round(item.opportunity_score)}/100`;
  const location = item.post_town || item.postcode_district || "UK opportunity";
  return <Link href={destination} className="block rounded-2xl border border-light-grey bg-white p-4 transition hover:border-signal-orange/40 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={owned ? "rounded-full bg-success/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-success" : "rounded-full bg-signal-orange/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-signal-orange"}>{owned ? "Full brief" : "Preview"}</span><span className="text-[10px] font-semibold uppercase tracking-wide text-slate">{humanize(item.planning_status)}</span></div><h3 className="mt-2 break-words text-sm font-bold text-charcoal">{item.project_type ?? "Buying-window opportunity"}</h3><p className="mt-1 text-xs text-slate">{location} · approximate area</p></div><div className="shrink-0 text-right"><p className="text-sm font-bold text-charcoal">{score}</p><p className="mt-1 text-[10px] text-slate">fit</p></div></div>{item.deadline_at && <p className="mt-3 text-xs text-warning">Buying window: {new Date(item.deadline_at).toLocaleDateString("en-GB")}</p>}{owned && item.summary && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate">{item.summary}</p>}{!owned && <p className="mt-3 text-xs leading-5 text-slate">Review the teaser, then unlock the complete company, contact and evidence brief for £20.</p>}<p className="mt-3 text-xs font-semibold text-signal-orange">{owned ? "Open full brief" : "Open marketplace"} →</p></Link>;
}

function humanize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

