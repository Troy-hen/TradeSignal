import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Not found</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal">We couldn&apos;t find that page.</h1>
        <p className="mt-4 text-sm leading-6 text-slate">The link may be outdated, or that territory may not be available in MyTradeBox yet.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/territories" className="rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e95f00]">
            Explore territories
          </Link>
          <Link href="/" className="rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal hover:border-signal-orange/40">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
