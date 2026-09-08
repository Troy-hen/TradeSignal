"use client";

import { useState, useTransition } from "react";
import { recordLeadAction } from "@/lib/actions/lead-actions";

type ActionType = "saved" | "contacted" | "quoted" | "won" | "lost";

const ACTIONS: { value: ActionType; label: string }[] = [
  { value: "saved", label: "Save" },
  { value: "contacted", label: "Mark Contacted" },
  { value: "quoted", label: "Mark Quoted" },
  { value: "won", label: "Mark Won" },
  { value: "lost", label: "Mark Lost" },
];

export function LeadActionPanel({ leadMatchId, currentAction }: { leadMatchId: string; currentAction: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [contractValue, setContractValue] = useState("");
  const [showWonInput, setShowWonInput] = useState(false);

  function handleAction(actionType: ActionType) {
    if (actionType === "won" && !showWonInput) {
      setShowWonInput(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await recordLeadAction({
        leadMatchId,
        actionType,
        contractValueGbp: actionType === "won" && contractValue ? Number(contractValue) : undefined,
      });
      if (result.error) setError(result.error);
      else setShowWonInput(false);
    });
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate">Keep the opportunity moving through your pipeline as you take action.</p>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.value}
            type="button"
            disabled={isPending}
            onClick={() => handleAction(a.value)}
            className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              currentAction === a.value
                ? "border-signal-orange bg-signal-orange text-white"
                : "border-light-grey bg-white text-charcoal hover:border-signal-orange/50 hover:bg-soft-surface"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {showWonInput && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate" htmlFor="contract-value">
            Contract value (£, optional):
          </label>
          <input
            id="contract-value"
            type="number"
            value={contractValue}
            onChange={(e) => setContractValue(e.target.value)}
            className="w-32 rounded-xl border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction("won")}
            className="rounded-xl bg-signal-orange px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Confirm Won
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
