import Link from "next/link";
import { B2B_TAXONOMY_GROUPS } from "@/lib/marketplace/catalog";
import { TerritoryCheckerWidget } from "@/components/territory-checker-widget";
import { MarketplacePreview } from "@/components/marketing/marketplace-preview";
import { FaqSection } from "@/components/marketing/faq";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { COVERAGE_PLANS, LEAD_UNLOCK_PRICE_GBP, formatMonthlyGbp } from "@/lib/coverage/pricing";

export default function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-soft-surface px-6 py-12 sm:py-16 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full border border-signal-orange/15" />
        <div className="pointer-events-none absolute -bottom-48 left-1/3 h-[30rem] w-[30rem] rounded-full border border-charcoal/5" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-14">
          <div className="max-w-2xl lg:pt-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-signal-orange/20 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-charcoal shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-signal-orange" />One platform. One intelligence engine.</div>
            <h1 className="mt-7 text-4xl font-bold leading-[1.05] tracking-tight text-charcoal sm:text-5xl lg:text-7xl">Find businesses <span className="text-signal-orange">ready to buy.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate sm:text-lg">From web design and software to accountancy, EPOS, signage, office furniture, facilities, consulting and specialist B2B services, tell Everro what you sell, who you sell to and where you operate. The platform finds the buying signals that fit your profile, then shows you why the opportunity matters now.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3"><HeroProof label="14-day trial" body="Choose coverage and start with no monthly fee today." /><HeroProof label="3 unlocks included" body="Test the quality with three complete leads at no charge." /><HeroProof label="£20 after that" body="Unlock only the individual opportunities worth working." /></div>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center"><Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal-orange px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-signal-orange/20 transition hover:bg-[#e95f00]">Start your 14-day trial <ArrowUpRight /></Link><Link href="#coverage-checker" className="inline-flex items-center justify-center gap-2 rounded-xl border border-light-grey bg-white px-5 py-3.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40">Preview an opportunity</Link></div>
          </div>
          <MarketplacePreview />
        </div>
      </section>

      <section id="coverage-checker" className="scroll-mt-24 bg-charcoal px-6 py-16 text-white sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
          <div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Start with your profile</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Tell us what you sell. Then choose where you operate.</h2><p className="mt-5 text-base leading-7 text-white/65">Use your own words. Everro normalises your description into a supplier profile, then looks across all available intelligence sources for relevant businesses entering a buying window.</p><div className="mt-8 space-y-4"><FlowStep number="01" title="Describe your business" body="Free text is turned into services, buyer types and relevance signals." /><FlowStep number="02" title="Choose your coverage shape" body="Local, Regional or Nationwide using counties, towns, cities or radius." /><FlowStep number="03" title="Try the marketplace" body="Your first 14 days include three complete lead unlocks; coverage billing starts after the trial." /></div></div>
          <div className="min-w-0"><TerritoryCheckerWidget compact /><p className="mt-4 text-center text-xs font-medium text-white/45">Preview the signal for free. Start with a 14-day trial and three lead unlocks, then pay £20 only for additional opportunities you choose.</p></div>
        </div>
        <div className="mx-auto mt-10 grid max-w-7xl gap-3 sm:grid-cols-3">{COVERAGE_PLANS.map((plan) => <div key={plan.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{plan.name}</p><p className="text-sm font-bold text-signal-orange">{formatMonthlyGbp(plan.monthlyPricePence)}/mo</p></div><p className="mt-2 text-xs leading-5 text-white/55">{plan.options.join(" · ")}</p></div>)}</div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-20 sm:py-24 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">How it works</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-5xl">Hundreds of sources. One buying-ready marketplace.</h2><p className="mt-5 text-base leading-7 text-slate sm:text-lg">Everro turns a large, messy signal surface into a short list your team can act on. Every stage is evidence-led and traceable, so the feed stays useful instead of becoming another noisy data dump.</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><PipelineCard number="01" title="Collect" body="Planning, procurement, business change, property and market signals from hundreds of relevant sources." /><PipelineCard number="02" title="Normalise" body="Resolve companies, locations, events and needs into one consistent opportunity record." /><PipelineCard number="03" title="Score" body="Rank freshness, intent, fit, timing and corroboration with deterministic, explainable logic." /><PipelineCard number="04" title="Marketplace" body={`Review the teaser, why now and evidence. Unlock the complete lead for ${LEAD_UNLOCK_PRICE_GBP} when it is worth pursuing.`} /></div></div></section>

      <section className="bg-soft-surface px-6 py-20 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Built for every B2B supplier</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-5xl">One intelligence engine. A much bigger opportunity surface.</h2>
            <p className="mt-5 text-base leading-7 text-slate sm:text-lg">The catalogue spans digital, software, professional, financial, premises, infrastructure, specialist and trade services. You describe your offer in your own words; the engine normalises it and only surfaces the buying needs that fit.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {B2B_TAXONOMY_GROUPS.map((group) => (
              <article key={group.slug} className="rounded-3xl border border-light-grey bg-white p-5">
                <h3 className="text-base font-bold text-charcoal">{group.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{group.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.examples.map((example) => <span key={example} className="rounded-full bg-soft-surface px-2.5 py-1 text-[11px] font-medium text-slate">{example}</span>)}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-slate">These are matching categories, not separate products. Availability depends on the live signal inventory in the geography you choose.</p>
          <Link href="/faq" className="mt-4 inline-flex text-sm font-semibold text-signal-orange">How the matching model works →</Link>
        </div>
      </section>
      <PricingGrid />

      <section className="bg-charcoal px-6 py-20 text-white sm:py-24 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">A cleaner commercial model</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Start with 14 days and three real lead unlocks.</h2><p className="mt-5 text-base leading-7 text-white/65 sm:text-lg">Choose the geography you need. There is no monthly coverage charge during the trial, then pay £20 only for each additional opportunity you decide is worth working.</p></div><Link href="/signup" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-signal-orange px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Start your trial <ArrowUpRight /></Link></div></section>

      <FaqSection compact />
    </div>
  );
}

function HeroProof({ label, body }: { label: string; body: string }) { return <div className="rounded-2xl border border-charcoal/10 bg-white/70 p-3"><p className="text-xs font-bold text-charcoal">{label}</p><p className="mt-1 text-[11px] leading-5 text-slate">{body}</p></div>; }
function FlowStep({ number, title, body }: { number: string; title: string; body: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-signal-orange shadow-sm">{number}</span><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/55">{body}</p></div></div>; }
function PipelineCard({ number, title, body }: { number: string; title: string; body: string }) { return <article className="rounded-3xl border border-light-grey bg-soft-surface p-6"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-orange text-xs font-bold text-white">{number}</span><h3 className="mt-6 text-xl font-bold tracking-tight text-charcoal">{title}</h3><p className="mt-3 text-sm leading-6 text-slate">{body}</p></article>; }
function ArrowUpRight() { return <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15 15 5M7 5h8v8" /></svg>; }
