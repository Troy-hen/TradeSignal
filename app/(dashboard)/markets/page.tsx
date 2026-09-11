import Link from "next/link";
import { INTELLIGENCE_SOURCES } from "@/lib/marketplace/catalog";
import { AppPageHeader } from "@/components/app-page-header";

export default function MarketsPage() {
  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader eyebrow="Intelligence sources" title="One engine. Every relevant signal." description="These are the source layers TradeSignal can connect. Tell us what you sell, who you sell to and where you operate; the intelligence engine decides what belongs in your feed." actions={<Link href="/coverage" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Manage coverage <span className="ml-2">→</span></Link>} stats={[{ label: "Connected layers", value: String(INTELLIGENCE_SOURCES.length), detail: "Shown for transparency" }, { label: "Plan access", value: "All", detail: "Included in every geography plan" }, { label: "Customer control", value: "Profile", detail: "Relevance follows your business" }]} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {INTELLIGENCE_SOURCES.map((source) => (
          <article key={source.slug} className="group flex min-h-[250px] flex-col rounded-3xl border border-light-grey bg-white p-6 transition hover:-translate-y-1 hover:border-signal-orange/40 hover:shadow-[0_18px_48px_rgba(31,41,55,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-signal-orange" aria-hidden="true">
                <SourceIcon />
              </span>
              <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-success">Included</span>
            </div>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-orange">{source.eyebrow}</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">{source.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate">{source.description}</p>
            <div className="mt-auto border-t border-light-grey pt-4">
              <div className="flex flex-wrap gap-2">
                {source.examples.map((example) => <span key={example} className="rounded-full bg-soft-surface px-2.5 py-1 text-[11px] font-medium text-slate">{example}</span>)}
              </div>
              <p className="mt-3 text-xs text-slate/80">{source.providerLine}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="grid gap-5 rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">The product rule</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">Your profile controls relevance. Geography controls reach.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate">Every relevant source is included in your plan. The same opportunity can suit more than one customer; you only pay when you choose to unlock it.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <RuleCard number="01" title="Describe" body="Tell the engine what you sell and who you sell to." />
          <RuleCard number="02" title="Qualify" body="Review why now, evidence, fit and buying window." />
          <RuleCard number="03" title="Unlock" body="Pay £20 only for an individual opportunity worth pursuing." />
        </div>
      </section>
    </div>
  );
}

function RuleCard({ number, title, body }: { number: string; title: string; body: string }) {
  return <div className="rounded-2xl border border-light-grey bg-white p-4"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal-orange/10 text-xs font-bold text-signal-orange">{number}</span><p className="mt-4 text-sm font-semibold text-charcoal">{title}</p><p className="mt-1 text-xs leading-5 text-slate">{body}</p></div>;
}

function SourceIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5V9.8L12 4l8 5.8v9.7" /><path strokeLinecap="round" d="M8 19.5v-5h8v5M3 19.5h18" /></svg>;
}
