import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TerritoryCheckerWidget } from "@/components/territory-checker-widget";

const FALLBACK_TRADES = [
  { slug: "general-builder", name: "General Builder" },
  { slug: "groundworks", name: "Groundworks" },
  { slug: "roofing", name: "Roofing" },
  { slug: "structural-steel", name: "Structural Steel" },
  { slug: "windows-doors", name: "Windows & Doors" },
  { slug: "landscaping", name: "Landscaping" },
  { slug: "electrical", name: "Electrical" },
  { slug: "plumbing-heating", name: "Plumbing & Heating" },
  { slug: "brickwork", name: "Brickwork" },
  { slug: "demolition", name: "Demolition" },
  { slug: "loft-conversion", name: "Loft Conversion" },
  { slug: "driveways", name: "Driveways" },
  { slug: "renewables", name: "Renewables" },
];

export default async function LandingPage() {
  let tradeOptions = FALLBACK_TRADES;

  try {
    const supabase = await createClient();
    const { data: trades } = await supabase
      .from("trade_categories")
      .select("slug, name")
      .eq("is_active", true)
      .order("display_order");

    if (trades && trades.length > 0) {
      tradeOptions = trades.map((trade) => ({ slug: trade.slug, name: trade.name }));
    }
  } catch {
    // Keep the marketing page usable while the data service is unavailable.
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-charcoal text-white">
        <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full border border-signal-orange/20" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full border border-white/10" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-14 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.96fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-orange" />
              Planning intelligence for trades
            </div>

            <h1 className="mt-7 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-7xl">
              Find the local jobs{" "}
              <span className="text-signal-orange">worth chasing.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              MyTradeBox turns planning applications into qualified opportunities for your trade and your local area. See the signal, estimate the value and make the next move before the competition gets there first.
            </p>

            <div id="territory-checker" className="mt-8 scroll-mt-28">
              <TerritoryCheckerWidget trades={tradeOptions} compact />
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/60">
              <span className="inline-flex items-center gap-2">
                <CheckIcon />
                No signup to preview
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckIcon />
                One business per territory
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckIcon />
                Built for the UK
              </span>
            </div>
          </div>

          <OpportunityPreview />
        </div>
      </section>

      <section className="border-b border-light-grey bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 sm:grid-cols-3 lg:px-8">
          <TrustPoint title="See signal, not spreadsheets" body="A clear score, value estimate and next action for every relevant project." />
          <TrustPoint title="Own your local patch" body="One business per trade and postcode district. No shared leads. No race to the bottom." />
          <TrustPoint title="Move at the right moment" body="Know what is happening, where it is happening and when to make contact." />
        </div>
      </section>

      <section id="how-it-works" className="bg-soft-surface px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-7xl lg:px-2">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">How MyTradeBox works</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              From planning application to paid work, with less guesswork.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate sm:text-lg">
              The useful information is already out there. MyTradeBox brings it together, filters it for your
              trade and puts the next move in front of you.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <BenefitCard
              number="01"
              title="Spot the right jobs"
              body="Planning applications are matched to the kind of work your business actually delivers, so you spend less time searching and more time qualifying."
            />
            <BenefitCard
              number="02"
              title="See the opportunity clearly"
              body="Every match is organised around the details that matter: opportunity score, project type, location, planning status and estimated trade value."
            />
            <BenefitCard
              number="03"
              title="Approach while it matters"
              body="Get the context and suggested next action you need to make a confident, timely introduction before the project is already spoken for."
            />
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:px-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Built around the next action</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              Less time hunting. More time quoting the right work.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate">
              MyTradeBox gives you a practical opportunity feed instead of another noisy list of raw planning
              records.
            </p>

            <ul className="mt-8 space-y-4">
              <FeatureLine>Opportunity scores that tell you where to focus first</FeatureLine>
              <FeatureLine>Estimated project and trade value to qualify the upside</FeatureLine>
              <FeatureLine>Planning context, location and timing in one view</FeatureLine>
              <FeatureLine>Suggested outreach to help you make the first move</FeatureLine>
            </ul>

            <Link
              href="#territory-checker"
              className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-signal-orange transition hover:text-[#e95f00]"
            >
              Check a postcode district
              <ArrowUpRight />
            </Link>
          </div>

          <OpportunityFeedPreview />
        </div>
      </section>

      <section className="bg-soft-surface px-6 py-24 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:px-2">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Territory ownership</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              Build a local patch you can actually own.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate sm:text-lg">
              MyTradeBox is built around focused, exclusive territories — so the opportunities you see are useful,
              actionable and yours to pursue.
            </p>

            <ul className="mt-8 space-y-4">
              <FeatureLine>One business per trade and postcode district</FeatureLine>
              <FeatureLine>No shared leads or race to the bottom</FeatureLine>
              <FeatureLine>Clear territory pricing before you commit</FeatureLine>
            </ul>

            <Link
              href="#territory-checker"
              className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-signal-orange transition hover:text-[#e95f00]"
            >
              Check availability
              <ArrowUpRight />
            </Link>
          </div>

          <div className="rounded-3xl bg-charcoal p-5 text-white shadow-2xl shadow-charcoal/15 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Territory preview</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">NR15 · General Builder</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Exclusive
              </span>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <TerritoryMetric label="New matches" value="8" />
              <TerritoryMetric label="High priority" value="3" />
              <TerritoryMetric label="Pipeline value" value="£42k" />
            </div>

            <div className="mt-6 flex items-start gap-3 border-t border-white/10 pt-5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckIcon />
              </span>
              <div>
                <p className="font-semibold">Your local opportunity feed</p>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  See the projects worth pursuing without competing against a shared pool of businesses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl lg:px-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Made for your trade</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
                A better way to find the work you want.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate">
              Start with your core service and expand into adjacent opportunities as your territory grows.
            </p>
          </div>

          <div className="mt-9 flex flex-wrap gap-2.5">
            {tradeOptions.map((trade) => (
              <span
                key={trade.slug}
                className="rounded-full border border-light-grey bg-soft-surface px-4 py-2.5 text-sm font-medium text-charcoal"
              >
                {trade.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-charcoal px-6 py-20 text-white sm:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:px-2">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">
              Local projects. Real opportunities.
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              When the right job appears, be first to know.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              Create your account, choose your territory and start building a more focused local pipeline.
            </p>
          </div>

          <Link
            href="/signup"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-signal-orange px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
          >
            Create your free account
            <ArrowUpRight />
          </Link>
        </div>
      </section>
    </div>
  );
}

function OpportunityPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg" aria-label="Example MyTradeBox opportunity preview">
      <div className="pointer-events-none absolute -right-5 -top-5 hidden h-24 w-24 rounded-2xl border border-signal-orange/30 sm:block" />
      <div className="relative rounded-3xl border border-white/15 bg-white p-3 text-charcoal shadow-2xl shadow-black/20 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">MyTradeBox feed</p>
            <p className="mt-1 text-sm font-medium text-charcoal">Example opportunity</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Live
          </span>
        </div>

        <div className="rounded-2xl border border-light-grey bg-soft-surface p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-signal-orange/10 text-signal-orange">
                <MapPinIcon />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">General Builder · NR15</p>
                <p className="mt-1 text-sm font-semibold text-charcoal">High-value match</p>
              </div>
            </div>
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-signal-orange/10">
              <span className="text-3xl font-bold leading-none text-signal-orange">86</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-signal-orange">Strong</span>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-lg font-bold tracking-tight text-charcoal">Two-storey rear extension</h3>
            <p className="mt-1 text-sm text-slate">Planning application · South Norfolk</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Estimated trade value" value="£12k–£18k" />
            <MiniStat label="Recommended action" value="Approach now" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-light-grey pt-4">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckIcon />
              </span>
              Exclusive to your territory
            </span>
            <span className="text-sm font-semibold text-signal-orange">View opportunity →</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-charcoal p-4 text-white">
            <p className="text-2xl font-bold">5</p>
            <p className="mt-1 text-xs text-white/60">new matches this week</p>
          </div>
          <div className="rounded-2xl border border-light-grey bg-white p-4">
            <p className="text-2xl font-bold text-charcoal">£42k</p>
            <p className="mt-1 text-xs text-slate">potential trade value</p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-white/15 bg-charcoal px-4 py-3 text-white shadow-xl sm:block">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-orange">Territory</p>
        <p className="mt-1 text-sm font-semibold">NR15 · General Builder</p>
      </div>
    </div>
  );
}

function OpportunityFeedPreview() {
  return (
    <div className="rounded-3xl bg-charcoal p-3 shadow-2xl shadow-charcoal/10 sm:p-4">
      <div className="rounded-2xl bg-soft-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity feed</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">Your local pipeline</p>
          </div>
          <span className="rounded-full border border-light-grey bg-white px-3 py-1.5 text-xs font-semibold text-slate">NR15 · Today</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Kpi label="New" value="8" />
          <Kpi label="High priority" value="3" />
          <Kpi label="Pipeline" value="£42k" />
        </div>

        <div className="mt-5 space-y-3">
          <FeedRow score="92" scoreClass="badge-hot" title="New-build bungalow" meta="NR15 · 1.8 miles" value="£18k–£25k" />
          <FeedRow score="86" scoreClass="badge-strong" title="Two-storey extension" meta="NR15 · 3.4 miles" value="£12k–£18k" />
          <FeedRow score="64" scoreClass="badge-possible" title="Loft conversion" meta="NR14 · 6.2 miles" value="£7k–£11k" />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-light-grey pt-4 text-sm">
          <span className="text-slate">Updated from recent planning activity</span>
          <span className="font-semibold text-signal-orange">View feed →</span>
        </div>
      </div>
    </div>
  );
}

function FeedRow({
  score,
  scoreClass,
  title,
  meta,
  value,
}: {
  score: string;
  scoreClass: string;
  title: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-light-grey bg-white p-3 sm:p-4">
      <div className={"flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl " + scoreClass}>
        <span className="text-lg font-bold leading-none">{score}</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]">score</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-charcoal">{title}</p>
        <p className="mt-1 truncate text-xs text-slate">{meta}</p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="text-xs text-slate">Est. value</p>
        <p className="mt-1 text-sm font-bold text-charcoal">{value}</p>
      </div>
    </div>
  );
}

function BenefitCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-light-grey bg-white p-6 sm:p-7">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-orange/10 text-sm font-bold text-signal-orange">
        {number}
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-charcoal">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate">{body}</p>
    </article>
  );
}

function FeatureLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-charcoal">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckIcon />
      </span>
      <span>{children}</span>
    </li>
  );
}

function TrustPoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-signal-orange pl-4">
      <p className="text-sm font-semibold text-charcoal">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate">{body}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-light-grey bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</p>
      <p className="mt-1 text-sm font-bold text-charcoal">{value}</p>
    </div>
  );
}

function TerritoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-light-grey bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-charcoal">{value}</p>
    </div>
  );
}

function ArrowUpRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}
