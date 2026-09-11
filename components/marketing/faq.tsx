import Link from "next/link";

export const FAQ_ITEMS = [
  {
    question: "What does TradeSignal do?",
    answer: "TradeSignal combines public and licensed business signals, understands what your business sells and surfaces companies entering a buying window. You see the evidence, relevance, likely need and next move in one opportunity feed.",
  },
  {
    question: "Do I have to choose a vertical or market?",
    answer: "No. The six signal layers are implementation details. Tell us what you sell, who you sell to and what to exclude; the intelligence engine decides which opportunities across the available sources are relevant.",
  },
  {
    question: "What does my monthly plan control?",
    answer: "Only geographic reach. Local is one county, selected towns or cities, or up to a 25-mile radius. Regional is up to three neighbouring counties, a larger place group, or up to 75 miles. Nationwide covers the UK.",
  },
  {
    question: "What does it cost to unlock a lead?",
    answer: "Each individual opportunity you choose to unlock is £20. There are no forced lead bundles, vertical add-ons, separate source subscriptions or exclusivity charges.",
  },
  {
    question: "What can I see before unlocking?",
    answer: "You can see the opportunity type, approximate geography, score, why-now explanation, likely needs, buying window, signal count and source-backed teaser. The complete company profile, contact enrichment and evidence view unlock after purchase.",
  },
  {
    question: "Are opportunities exclusive?",
    answer: "No. Relevance is customer-specific, but the underlying opportunity may be relevant to multiple businesses. TradeSignal helps each customer decide whether a particular lead is worth a £20 unlock.",
  },
  {
    question: "Are the values guaranteed?",
    answer: "No. Source data can be incomplete, delayed or changed. Scores, buying windows and values are evidence-grounded indicators to help prioritise outreach, not valuations or promises of work.",
  },
  {
    question: "Can I push an unlocked lead to my CRM?",
    answer: "Yes. The product is designed to save, export and push unlocked opportunities to CRM tools, with deduplication and outcome feedback so the matching loop can improve.",
  },
] as const;

export function FaqSection({ compact = false }: { compact?: boolean }) {
  const items = compact ? FAQ_ITEMS.slice(0, 6) : FAQ_ITEMS;

  return (
    <section id="faq" className="bg-soft-surface px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Questions, answered</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Clear before you commit.</h2><p className="mt-5 text-base leading-7 text-slate">The short version of how the profile, coverage and individual unlock model works.</p></div>
        <div className="mt-9 space-y-3">{items.map((item) => <details key={item.question} className="group rounded-2xl border border-light-grey bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 text-left text-sm font-semibold text-charcoal [&::-webkit-details-marker]:hidden sm:px-6 sm:py-5"><span>{item.question}</span><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft-surface text-lg font-normal text-signal-orange transition-transform group-open:rotate-45">+</span></summary><p className="border-t border-light-grey px-5 py-4 text-sm leading-6 text-slate sm:px-6">{item.answer}</p></details>)}</div>
        {compact && <Link href="/faq" className="mt-7 inline-flex text-sm font-semibold text-signal-orange hover:text-[#e95f00]">Read all FAQs →</Link>}
      </div>
    </section>
  );
}
