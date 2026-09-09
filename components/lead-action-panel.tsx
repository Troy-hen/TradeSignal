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
    <div className="rounded-2xl bg-charcoal p-5 text-white sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-orange">Next action</p>
      <p className="mt-2 text-sm leading-6 text-white/65">Keep the opportunity moving through your pipeline as you take action.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.value}
            type="button"
            disabled={isPending}
            onClick={() => handleAction(a.value)}
            className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              currentAction === a.value
                ? "border-signal-orange bg-signal-orange text-white"
                : "border-white/15 bg-white/10 text-white hover:border-signal-orange/60 hover:bg-white/15"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {showWonInput && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <label className="text-sm text-white/65" htmlFor="contract-value">
            Contract value (£, optional):
          </label>
          <input
            id="contract-value"
            type="number"
            value={contractValue}
            onChange={(e) => setContractValue(e.target.value)}
            className="w-32 rounded-xl border border-white/15 bg-white px-3 py-2 text-sm text-charcoal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
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
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
