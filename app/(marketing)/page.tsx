import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TerritoryCheckerWidget } from "@/components/territory-checker-widget";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: trades } = await supabase
    .from("trade_categories")
    .select("slug, name, description")
    .eq("is_active", true)
    .order("display_order");

  const tradeOptions = (trades ?? []).map((t) => ({ slug: t.slug, name: t.name }));

  return (
    <div>
      <section className="bg-white px-6 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-charcoal sm:text-5xl">
          Know which local jobs to chase — before your competitors do.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate">
          TradeSignal monitors UK planning applications, works out which projects fit your trade, estimates what
          the work could be worth, and tells you when to act. One business per postcode district and trade —
          exclusive, never shared.
        </p>

        <div className="mt-10">
          <TerritoryCheckerWidget trades={tradeOptions} />
        </div>
      </section>

      <section className="bg-soft-surface px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-charcoal">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Step
              number="1"
              title="We watch planning applications"
              body="Every UK planning application in your area is checked automatically, every day — nothing to search for yourself."
            />
            <Step
              number="2"
              title="AI scores each opportunity"
              body="Project type, likely scope, and an indicative value estimate — specific to your trade, not generic planning data."
            />
            <Step
              number="3"
              title="You get alerted"
              body="High-priority matches land in your inbox instantly. Everything else arrives as a daily or weekly digest, your choice."
            />
            <Step
              number="4"
              title="You approach with confidence"
              body="Full address, planning reference, recommended timing, and AI-drafted outreach copy — ready to personalise and send."
            />
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-semibold text-charcoal">Built for every trade</h2>
          <p className="mt-2 text-slate">Claim your territory in any of these — or ask us to add yours.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {tradeOptions.map((t) => (
              <span key={t.slug} className="rounded-full border border-light-grey px-4 py-2 text-sm font-medium text-charcoal">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-charcoal px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-white">Territories are exclusive — and they go fast.</h2>
        <p className="mx-auto mt-2 max-w-xl text-slate">
          Once a business claims a postcode district for your trade, it&apos;s theirs alone. Check your area above,
          or create a free account to start browsing straight away.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-md bg-signal-orange px-8 py-3 font-semibold text-white transition hover:brightness-95"
        >
          Sign up free
        </Link>
      </section>
    </div>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-orange text-sm font-bold text-white">
        {number}
      </div>
      <h3 className="mt-3 font-semibold text-charcoal">{title}</h3>
      <p className="mt-1 text-sm text-slate">{body}</p>
    </div>
  );
}
