"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Capabilities = { planningContactData?: boolean };

export function PlanningContactLookup({ opportunityId, hasContacts }: { opportunityId: string; hasContacts: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capabilities", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: Capabilities | null) => {
        if (cancelled) return;
        setEnabled(Boolean(data?.planningContactData));
        setChecked(true);
      })
      .catch(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, []);

  if (hasContacts || !checked) return null;

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-light-grey bg-soft-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-charcoal">Published project contacts</p>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate">Not enabled</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate">
          This planning record did not include a named professional contact in the core feed. Contact lookup is an on-demand enrichment service rather than a field MyTradeBox can safely invent or infer.
        </p>
      </div>
    );
  }

  function lookup() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/opportunities/${opportunityId}/contacts/lookup`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.error === "contact_lookup_failed") setError("No published professional contact could be returned for this planning record.");
        else if (data.error === "contact_provider_not_configured") setError("Planning contact enrichment is temporarily unavailable.");
        else setError("Contact lookup could not complete.");
        return;
      }
      if (Array.isArray(data.contacts) && data.contacts.length === 0) {
        setError("The provider returned no published professional contact for this record.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-signal-orange/20 bg-signal-orange/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-charcoal">Find published project contacts</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-signal-orange">On demand</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate">
        Check the planning-data provider for a published architect, planning agent or business contact. The lookup is explicit because contact-bearing records can be metered and may not exist for every application.
      </p>
      <button type="button" onClick={lookup} disabled={isPending} className="mt-3 rounded-xl bg-signal-orange px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-50">
        {isPending ? "Checking…" : "Check published contacts"}
      </button>
      {error && <p className="mt-2 text-xs leading-5 text-warning">{error}</p>}
    </div>
  );
}
