"use client";

import { useState } from "react";

export function BillingPortalButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const body = await res.json().catch(() => ({}) as { error?: string; url?: string });

      if (!res.ok || !body.url) {
        setError(
          body.error === "no_billing_account"
            ? "No billing account yet — claim a territory first."
            : "Could not open the billing portal. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Network error — please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:opacity-60"
      >
        {isLoading ? "Opening…" : "Manage billing"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
