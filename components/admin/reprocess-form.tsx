"use client";

import { useState, useTransition } from "react";
import { reprocessApplication } from "@/lib/actions/admin";

export function ReprocessForm({ planningApplicationId }: { planningApplicationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await reprocessApplication(planningApplicationId);
      setMessage(result.error ?? "Reprocess triggered.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-xs text-slate">{message}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-signal-orange px-3 py-1 text-xs font-semibold text-signal-orange transition hover:bg-signal-orange hover:text-white disabled:opacity-60"
      >
        {isPending ? "Reprocessing…" : "Reprocess"}
      </button>
    </div>
  );
}
