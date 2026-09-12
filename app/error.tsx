"use client";

import { useEffect } from "react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the user-facing message safe while retaining a diagnostic in the
    // Worker logs for operational investigation.
    console.error("TradeSignal route error");
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Temporary problem</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal">That page didn&apos;t load.</h1>
        <p className="mt-4 text-sm leading-6 text-slate">Try again, or return to your workspace while we recover the latest data.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e95f00]">
            Try again
          </button>
          <a href="/dashboard" className="rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal hover:border-signal-orange/40">
            Go to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
