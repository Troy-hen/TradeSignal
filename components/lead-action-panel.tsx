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
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.value}
            type="button"
            disabled={isPending}
            onClick={() => handleAction(a.value)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
              currentAction === a.value
                ? "border-signal-orange bg-signal-orange text-white"
                : "border-light-grey text-charcoal hover:border-signal-orange"
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
            className="w-32 rounded-md border border-light-grey px-2 py-1 text-sm"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction("won")}
            className="rounded-md bg-signal-orange px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Confirm Won
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
