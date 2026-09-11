"use client";

import Link from "next/link";
import { useState } from "react";
import { LEAD_UNLOCK_PRICE_GBP } from "@/lib/coverage/pricing";

export function LeadUnlockButton({
  opportunityId,
  marketSignalId,
  previewOnly = false,
  compact = false,
}: {
  opportunityId?: string;
  marketSignalId?: string;
  previewOnly?: boolean;
  compact?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (previewOnly) {
    return (
      <Link
        href="/signup?intent=lead-unlock"
        className={compact ? "inline-flex items-center justify-center rounded-xl bg-signal-orange px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#e95f00]" : "inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]"}
      >
        See your opportunities <span className="ml-2">→</span>
      </Link>
    );
  }

  async function beginCheckout() {
    if (!opportunityId && !marketSignalId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunityId, market_signal_id: marketSignalId }),
      });
      const body = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok) {
        setError(errorCopy(body.error));
        return;
      }
      if (body.url) window.location.assign(body.url);
    } catch {
      setError("Checkout is unavailable right now. Please try again shortly.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={beginCheckout}
        disabled={isLoading}
        className={compact ? "inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60" : "inline-flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60"}
      >
        {isLoading ? "Opening secure checkout…" : `Unlock lead · ${LEAD_UNLOCK_PRICE_GBP}`}
      </button>
      {error && <p role="alert" className="mt-2 text-[11px] leading-4 text-danger">{error}</p>}
    </div>
  );
}

function errorCopy(error: string | undefined): string {
  switch (error) {
    case "unauthenticated":
      return "Sign in to unlock this lead.";
    case "checkout_in_progress":
      return "A checkout for this lead is already in progress.";
    case "opportunity_not_found":
      return "This opportunity is no longer available.";
    case "vertical_unlock_limit_reached":
      return "You have reached the three-lead limit for this opportunity category. Your purchased leads remain available in Purchased leads.";
    case "opportunity_not_categorised":
      return "This opportunity is still being categorised. Please try again later.";
    case "checkout_unavailable":
      return "Checkout is unavailable right now. Please try again shortly.";
    default:
      return "We could not start checkout. Please try again.";
  }
}
