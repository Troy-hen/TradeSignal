"use client";

import { useState, useTransition } from "react";
import { recordMarketSignalAction } from "@/lib/actions/market-signal-actions";

const ACTIONS = [
  ["saved", "Save"],
  ["contacted", "Contacted"],
  ["bid_planned", "Bid planned"],
  ["bid_submitted", "Bid submitted"],
  ["quoted", "Quoted"],
  ["won", "Won"],
  ["lost", "Lost"],
] as const;

export function MarketSignalActionPanel({ matchId, currentAction }: { matchId: string; currentAction: string }) {
  const [selected, setSelected] = useState(currentAction || "new");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [pending, startTransition] = useTransition();

  function choose(action: (typeof ACTIONS)[number][0]) {
    setError(null);
    startTransition(async () => {
      const result = await recordMarketSignalAction({ matchId, action, note: note || undefined, contractValueGbp: action === "won" && contractValue ? Number(contractValue) : undefined });
      if (result.error) setError(result.error);
      else setSelected(action);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={pending}
            onClick={() => choose(value)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${selected === value ? "border-charcoal bg-charcoal text-white" : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-warning">{error}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <label className="text-xs font-semibold text-slate">Internal note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Record the next step or response…" className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2 text-sm font-normal text-charcoal placeholder:text-slate/50 focus:border-signal-orange focus:outline-none" /></label>
        <label className="text-xs font-semibold text-slate">Won value (£)<input type="number" min="0" value={contractValue} onChange={(event) => setContractValue(event.target.value)} placeholder="Optional" className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2 text-sm font-normal text-charcoal placeholder:text-slate/50 focus:border-signal-orange focus:outline-none" /></label>
      </div>
    </div>
  );
}
