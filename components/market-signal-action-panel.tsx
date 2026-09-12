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
  const [pending, startTransition] = useTransition();

  function choose(action: (typeof ACTIONS)[number][0]) {
    setError(null);
    startTransition(async () => {
      const result = await recordMarketSignalAction({ matchId, action });
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
    </div>
  );
}
