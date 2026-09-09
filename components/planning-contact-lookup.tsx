"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Capabilities = { planningContactData?: boolean };

export function PlanningContactLookup({ opportunityId, hasContacts }: { opportunityId: string; hasContacts: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capabilities", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: Capabilities | null) => { if (!cancelled) setEnabled(Boolean(data?.planningContactData)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!enabled || hasContacts) return null;

  function lookup() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/opportunities/${opportunityId}/contacts/lookup`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error === "contact_lookup_failed" ? "Published planning contact data was not available for this record." : "Contact lookup could not complete.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-5 rounded-2xl border border-signal-orange/20 bg-signal-orange/[0.04] p-4">
      <p className="text-sm font-semibold text-charcoal">Published planning contact data available</p>
      <p className="mt-1 text-xs leading-5 text-slate">
        Check Plota for the planning agent&apos;s published business email or phone. This is an explicit lookup because contact-bearing records are metered by the provider.
      </p>
      <button
        type="button"
        onClick={lookup}
        disabled={isPending}
        className="mt-3 rounded-xl bg-signal-orange px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
      >
        {isPending ? "Checking…" : "Reveal planning contact"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
