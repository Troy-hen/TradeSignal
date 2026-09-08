"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { normalisePostcodeDistrict } from "@/lib/postcode";

type TradeOption = { id: string; slug: string; name: string };

export function TerritorySearchForm({
  trades,
  defaultDistrict,
  defaultTradeSlug,
}: {
  trades: TradeOption[];
  defaultDistrict?: string;
  defaultTradeSlug?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [district, setDistrict] = useState(defaultDistrict ?? "");
  const [tradeSlug, setTradeSlug] = useState(defaultTradeSlug ?? trades[0]?.slug ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = normalisePostcodeDistrict(district);
    if (!cleaned || !tradeSlug) return;
    startTransition(() => {
      router.push(`/territories/${encodeURIComponent(cleaned)}/${encodeURIComponent(tradeSlug)}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-light-grey bg-white p-5 shadow-[0_18px_50px_rgba(31,41,55,0.06)] sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-orange/10 text-signal-orange">
          <MapPinIcon />
        </span>
        <div>
          <p className="font-semibold text-charcoal">Find your local signal</p>
          <p className="mt-1 text-sm leading-6 text-slate">Search by postcode district and trade to see whether the territory is worth claiming.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Postcode district</span>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="e.g. NR15"
            autoComplete="postal-code"
            required
            maxLength={8}
            className="w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Your trade</span>
          <select
            value={tradeSlug}
            onChange={(e) => setTradeSlug(e.target.value)}
            className="w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
          >
            {trades.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending || trades.length === 0}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Searching…" : "Check this territory"}
        {!isPending && <span className="ml-2">→</span>}
      </button>
      {trades.length === 0 && (
        <p role="status" className="mt-3 text-center text-xs text-danger">
          Trade options are temporarily unavailable. Please refresh and try again.
        </p>
      )}
      <p className="mt-3 text-center text-xs text-slate">Try NR15, IP22 or SW11.</p>
    </form>
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
