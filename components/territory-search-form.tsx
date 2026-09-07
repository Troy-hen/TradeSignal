"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
    const cleaned = district.trim().toUpperCase();
    if (!cleaned || !tradeSlug) return;
    startTransition(() => {
      router.push(`/territories/${encodeURIComponent(cleaned)}/${encodeURIComponent(tradeSlug)}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        value={district}
        onChange={(e) => setDistrict(e.target.value)}
        placeholder="Postcode district, e.g. NR15"
        className="flex-1 rounded-md border border-light-grey px-3 py-2.5 text-sm focus:border-signal-orange focus:outline-none"
      />
      <select
        value={tradeSlug}
        onChange={(e) => setTradeSlug(e.target.value)}
        className="rounded-md border border-light-grey px-3 py-2.5 text-sm focus:border-signal-orange focus:outline-none sm:w-56"
      >
        {trades.map((t) => (
          <option key={t.id} value={t.slug}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-signal-orange px-6 py-2.5 font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
      >
        {isPending ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
