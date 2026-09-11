import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MARKETPLACE_MARKETS } from "@/lib/marketplace/catalog";
import { TerritoryCheckerWidget } from "@/components/territory-checker-widget";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";
import { FaqSection } from "@/components/marketing/faq";
import { PricingGrid, type PricingItem } from "@/components/marketing/pricing-grid";

const FALLBACK_TRADES: PricingItem[] = [
  { slug: "general-builder", name: "General Builder", description: "Extensions, conversions and whole-project builds", monthlyPricePence: 2999 },
  { slug: "groundworks", name: "Groundworks", description: "Excavation, foundations, drainage and site preparation", monthlyPricePence: 2999 },
  { slug: "roofing", name: "Roofing", description: "Re-roofing, roof extensions and roofline work", monthlyPricePence: 2999 },
  { slug: "electrical", name: "Electrical", description: "Rewiring, consumer units, EV charging and new circuits", monthlyPricePence: 2999 },
  { slug: "plumbing-heating", name: "Plumbing & Heating", description: "Boilers, heating systems, bathrooms and heat pumps", monthlyPricePence: 2999 },
  { slug: "landscaping", name: "Landscaping", description: "Gardens, patios, boundaries and external works", monthlyPricePence: 2999 },
];

export default async function LandingPage() {
  let tradeOptions: PricingItem[] = FALLBACK_TRADES;

  try {
    const supabase = await createClient();
    const { data: trades } = await supabase
      .from("trade_categories")
      .select("slug, name, description, default_monthly_price_pence")
      .eq("is_active", true)
      .order("display_order");

    if (trades && trades.length > 0) {
      tradeOptions = trades.map((trade) => ({ slug: trade.slug, name: trade.name, description: trade.description, monthlyPricePence: trade.default_monthly_price_pence }));
    }
  } catch {
    // Keep the marketplace landing page useful while the data service is unavailable.
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-soft-surface px-6 py-12 sm:py-16 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full border border-signal-orange/15" />
        <div className="pointer-events-none absolute -bottom-48 left-1/3 h-[30rem] w-[30rem] rounded-full border border-charcoal/5" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-signal-orange/20 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-charcoal shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-signal-orange" />The UK opportunity marketplace</div>
            <h1 className="mt-7 text-4xl font-bold leading-[1.05] tracking-tight text-charcoal sm:text-5xl lg:text-7xl">Find businesses <span className="text-signal-orange">ready to buy.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate sm:text-lg">MyTradeBox turns planning, procurement and business-change signals into an exclusive, actionable sales pipeline for your trade.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3"><HeroProof label="Why now" body="See the trigger behind the opportunity." /><HeroProof label="Fit score" body="Prioritise the work worth chasing." /><HeroProof label="Next action" body="Move from signal to conversation." /></div>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center"><Link href="#market-checker" className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal-orange px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-signal-orange/20 transition hover:bg-[#e95f00]">Explore your market <ArrowUpRight /></Link><Link href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-xl border border-light-grey bg-white px-5 py-3.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40">See how it works</Link></div>
          </div>

          <MarketplacePreview />
        </div>
      </section>

      <section id="market-checker" className="scroll-mt-24 bg-charcoal px-6 py-16 text-white sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
          <div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Start with your market</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">What do you sell? Where do you sell?</h2><p className="mt-5 text-base leading-7 text-white/65">Preview the local opportunity surface before you create an account. See real activity, indicative value, territory availability and a teaser of the evidence-backed cards inside.</p><div className="mt-8 space-y-4"><MarketStep number="01" title="Choose your supplier category" body="Tell the marketplace what your business can deliver." /><MarketStep number="02" title="Choose your geography" body="Start with a postcode district you already serve." /><MarketStep number="03" title="Review before you commit" body="Check the signal, then decide whether to own the market." /></div></div>
          <div className="min-w-0"><TerritoryCheckerWidget trades={tradeOptions} compact /><p className="mt-4 text-center text-xs font-medium text-white/45">No account needed to preview. Specific businesses, decision makers and full evidence remain protected until the right entitlement or unlock.</p></div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-20 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">How the marketplace works</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">From public signal to closed-loop pipeline.</h2><p className="mt-5 text-base leading-7 text-slate sm:text-lg">MyTradeBox helps you qualify demand before you spend time chasing it, then keeps the commercial outcome attached to the original signal.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><StepCard number="01" title="Select a market" body="Choose the opportunity layers that match your service and growth plan." /><StepCard number="02" title="See why now" body="Review the trigger, evidence, timing, value and fit before you act." /><StepCard number="03" title="Unlock when ready" body="Reveal the business and named contact only after the signal earns your attention." /><StepCard number="04" title="Close the loop" body="Send a personalised approach, use QuoteLink and record what happened." /></div></div>
      </section>

      <section className="bg-soft-surface px-6 py-20 sm:py-24 lg:px-8"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:px-2"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">See the shape before the unlock</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">A marketplace card should tell you what to do next.</h2><p className="mt-5 text-base leading-7 text-slate">Preview enough to make a useful decision. Protect the identity, exact address and contact details until the opportunity is qualified and the access rule is satisfied.</p><ul className="mt-8 space-y-4"><FeatureLine>Project or buying signal, stage and indicative value</FeatureLine><FeatureLine>Evidence trail and source attribution</FeatureLine><FeatureLine>Fit, urgency and recommended next action</FeatureLine><FeatureLine>Named-contact enrichment only when it is worth paying for</FeatureLine></ul><Link href="/signup" className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-signal-orange hover:text-[#e95f00]">Create your free account <ArrowUpRight /></Link></div><div className="rounded-3xl bg-charcoal p-3 shadow-2xl shadow-charcoal/10 sm:p-5"><div className="rounded-2xl bg-soft-surface p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Illustrative marketplace card</p><p className="mt-1 text-lg font-semibold text-charcoal">Qualified before unlocked</p></div><span className="rounded-full bg-signal-orange/10 px-3 py-1.5 text-xs font-bold text-signal-orange">Evidence-led</span></div><div className="mt-5"><LockedOpportunityPreview compact title="Unlock the business when the signal is right" body="The marketplace keeps identity and contact detail protected until your market access or contact unlock applies." teaser={{ projectType: "Commercial fit-out", status: "Signal detected", estimatedTradeValueLow: 12000, estimatedTradeValueHigh: 28000 }} /></div></div></div></div></section>

      <section className="bg-white px-6 py-20 sm:py-24 lg:px-8"><div className="mx-auto max-w-7xl lg:px-2"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Opportunity markets</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Start with one market. Expand when it proves useful.</h2></div><p className="max-w-md text-sm leading-6 text-slate">The long-term platform brings multiple buying signals into one decision surface, with vendor adapters added progressively and rights preserved by source.</p></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{MARKETPLACE_MARKETS.map((market) => <article key={market.slug} className="rounded-2xl border border-light-grey bg-soft-surface p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-charcoal">{market.name}</p><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate">{market.stage === "core" ? "Core" : "Expanding"}</span></div><p className="mt-2 text-sm leading-6 text-slate">{market.description}</p><div className="mt-4 flex flex-wrap gap-2">{market.examples.map((example) => <span key={example} className="rounded-full border border-light-grey bg-white px-2.5 py-1 text-[11px] font-medium text-slate">{example}</span>)}</div></article>)}</div></div></section>

      <PricingGrid items={tradeOptions} compact />
      <FaqSection compact />

      <section className="bg-charcoal px-6 py-20 text-white sm:py-24 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:px-2"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Build a better local pipeline</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Own the right market. Work the right signal.</h2><p className="mt-5 max-w-xl text-base leading-7 text-white/65 sm:text-lg">Start free, preview your area, then build exclusive market coverage around the work your business actually wants.</p></div><Link href="/signup" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-signal-orange px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Create your free account <ArrowUpRight /></Link></div></section>
    </div>
  );
}

function MarketplacePreview() {
  return <div className="relative mx-auto w-full max-w-xl"><div className="pointer-events-none absolute -right-6 -top-6 hidden h-24 w-24 rounded-2xl border border-signal-orange/25 sm:block" /><div className="rounded-[2rem] bg-charcoal p-3 shadow-2xl shadow-charcoal/15 sm:p-4"><div className="rounded-3xl bg-white p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">Illustrative marketplace view</p><p className="mt-1 text-lg font-semibold text-charcoal">Your opportunity market</p></div><span className="rounded-full bg-signal-orange/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-signal-orange">Evidence-led</span></div><div className="mt-5 grid grid-cols-3 gap-3"><PreviewMetric label="Hot" value="Focus" tone="orange" /><PreviewMetric label="Warm" value="Review" tone="blue" /><PreviewMetric label="Early" value="Watch" tone="green" /></div><div className="mt-5 space-y-3"><PreviewRow label="Why now" title="New commercial activity detected" detail="Evidence and timing attached" /><PreviewRow label="Fit" title="Matched to your supplier category" detail="Score before unlock" /><PreviewRow label="Next" title="Make the first move" detail="Outreach and feedback loop" /></div><div className="mt-5 flex items-center justify-between border-t border-light-grey pt-4 text-xs"><span className="text-slate">Market × category × geography</span><span className="font-semibold text-signal-orange">Explore →</span></div></div></div><p className="mt-4 text-center text-xs font-medium text-slate">A clearer way to decide which opportunities deserve your time.</p></div>;
}

function PreviewMetric({ label, value, tone }: { label: string; value: string; tone: "orange" | "blue" | "green" }) { const styles = { orange: "border-signal-orange/25 bg-signal-orange/[0.06]", blue: "border-slate/15 bg-slate/[0.035]", green: "border-success/20 bg-success/[0.04]" }[tone]; return <div className={`rounded-2xl border p-3 ${styles}`}><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-2 text-sm font-bold text-charcoal">{value}</p></div>; }
function PreviewRow({ label, title, detail }: { label: string; title: string; detail: string }) { return <div className="flex items-center gap-3 rounded-2xl border border-light-grey bg-soft-surface p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal-orange/10 text-signal-orange"><span className="h-2 w-2 rounded-full bg-signal-orange" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-0.5 truncate text-sm font-semibold text-charcoal">{title}</p><p className="mt-0.5 text-xs text-slate">{detail}</p></div><span className="text-signal-orange">→</span></div>; }
function HeroProof({ label, body }: { label: string; body: string }) { return <div className="rounded-2xl border border-light-grey bg-white p-3 shadow-sm"><p className="text-xs font-bold text-charcoal">{label}</p><p className="mt-1 text-[11px] leading-5 text-slate">{body}</p></div>; }
function MarketStep({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-signal-orange">{number}</span><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/55">{body}</p></div></div>; }
function StepCard({ number, title, body }: { number: string; title: string; body: string }) { return <article className="rounded-3xl border border-light-grey bg-soft-surface p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-sm font-bold text-signal-orange">{number}</div><h3 className="mt-6 text-xl font-semibold tracking-tight text-charcoal">{title}</h3><p className="mt-3 text-sm leading-6 text-slate">{body}</p></article>; }
function FeatureLine({ children }: { children: React.ReactNode }) { return <li className="flex items-start gap-3 text-sm leading-6 text-charcoal"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"><CheckIcon /></span><span>{children}</span></li>; }
function CheckIcon() { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.5 4.5L19 7" /></svg>; }
function ArrowUpRight({ className = "h-4 w-4" }: { className?: string }) { return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M8 7h9v9" /></svg>; }
