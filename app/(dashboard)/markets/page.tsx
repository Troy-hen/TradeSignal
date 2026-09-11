import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MARKETPLACE_MARKETS } from "@/lib/marketplace/catalog";

export default async function MarketsPage() {
  const supabase = await createClient();
  const { data: trades } = await supabase
    .from("trade_categories")
    .select("id")
    .eq("is_active", true);

  return (
    <div className="min-w-0 space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-charcoal p-6 text-white shadow-xl shadow-charcoal/10 sm:p-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Marketplace directory</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Choose the markets you want to win.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
              MyTradeBox is moving from a single planning feed to a connected opportunity marketplace. Pick the commercial signals that fit your business, then combine them with the geographies you own.
            </p>
          </div>
          <Link href="/opportunities" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">
            Open marketplace <span className="ml-2">→</span>
          </Link>
        </div>

        <div className="mt-8 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          <MarketStat label="Market layers" value={String(MARKETPLACE_MARKETS.length)} detail="One workspace, multiple reasons to buy" />
          <MarketStat label="Active supplier categories" value={String(trades?.length ?? 0)} detail="Trade categories currently configured" />
          <MarketStat label="Commercial edge" value="Why now" detail="Every match carries evidence and next action" />
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {MARKETPLACE_MARKETS.map((market) => (
          <article key={market.slug} className="group flex min-h-[250px] flex-col rounded-3xl border border-light-grey bg-white p-6 transition hover:-translate-y-1 hover:border-signal-orange/40 hover:shadow-[0_18px_48px_rgba(31,41,55,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-signal-orange" aria-hidden="true">
                <MarketIcon />
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${market.stage === "core" ? "bg-success/10 text-success" : "bg-soft-surface text-slate"}`}>
                {market.stage === "core" ? "Core feed" : "Expanding"}
              </span>
            </div>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-orange">{market.eyebrow}</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">{market.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate">{market.description}</p>
            <div className="mt-auto border-t border-light-grey pt-4">
              <div className="flex flex-wrap gap-2">
                {market.examples.map((example) => <span key={example} className="rounded-full bg-soft-surface px-2.5 py-1 text-[11px] font-medium text-slate">{example}</span>)}
              </div>
              <p className="mt-3 text-xs text-slate/80">{market.providerLine}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="grid gap-5 rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">The marketplace rule</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">Market × supplier category × geography.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate">Your commercial edge comes from owning the right combination, not from receiving another undifferentiated list of raw records.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <RuleCard number="01" title="Select" body="Choose the markets where your business can deliver." />
          <RuleCard number="02" title="Qualify" body="Review why now, evidence, fit and timing." />
          <RuleCard number="03" title="Act" body="Unlock, contact, follow up and feed the outcome back." />
        </div>
      </section>
    </div>
  );
}

function MarketStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p><p className="mt-1 text-xs leading-5 text-white/55">{detail}</p></div>;
}

function RuleCard({ number, title, body }: { number: string; title: string; body: string }) {
  return <div className="rounded-2xl border border-light-grey bg-white p-4"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal-orange/10 text-xs font-bold text-signal-orange">{number}</span><p className="mt-4 text-sm font-semibold text-charcoal">{title}</p><p className="mt-1 text-xs leading-5 text-slate">{body}</p></div>;
}

function MarketIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5V9.8L12 4l8 5.8v9.7" /><path strokeLinecap="round" d="M8 19.5v-5h8v5M3 19.5h18" /></svg>;
}
