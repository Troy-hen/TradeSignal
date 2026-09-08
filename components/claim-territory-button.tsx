"use client";

import { useState } from "react";

const ERROR_COPY: Record<string, string> = {
  unauthenticated: "Sign in or create a free account before claiming a territory.",
  territory_unavailable:
    "This territory was just claimed by another business. Refresh the page to see current availability.",
  no_authorized_company: "Finish setting up your company before claiming a territory.",
  unknown_territory: "We couldn't recognise that postcode district or trade.",
  reservation_failed: "We couldn't reserve this territory. Please refresh and try again.",
  checkout_failed: "Something went wrong starting checkout. Please try again.",
  demo_activation_failed: "We could not activate the demo territory. Please try again.",
};

export function ClaimTerritoryButton({
  postcodeDistrict,
  tradeCategoryId,
  priceLabel,
}: {
  postcodeDistrict: string;
  tradeCategoryId: string;
  priceLabel: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/territory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode_district: postcodeDistrict,
          trade_category_id: tradeCategoryId,
        }),
      });
      const body = await res.json().catch(() => ({}) as { error?: string; url?: string });

      if (!res.ok || !body.url) {
        setError(ERROR_COPY[body.error ?? ""] ?? "Something went wrong. Please try again.");
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
        onClick={handleClaim}
        disabled={isLoading}
        aria-busy={isLoading}
        className="rounded-md bg-signal-orange px-6 py-3 font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
      >
        {isLoading ? "Starting checkout…" : "Claim " + postcodeDistrict + " — " + priceLabel + "/month"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
