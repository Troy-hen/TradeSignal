"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * The Stripe success_url lands here. This page never activates anything
 * itself — it polls territory_claims.status, which only the webhook ever
 * changes, and redirects once payment is actually confirmed.
 */
export default function ConfirmingClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-16 text-center">
          <ConfirmingMessage />
        </div>
      }
    >
      <ConfirmingClaimContent />
    </Suspense>
  );
}

function ConfirmingClaimContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const claimId = searchParams.get("claim");
  const [status, setStatus] = useState("checking");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!claimId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/territory-claims/${claimId}/status`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const body: { status: string } = await res.json();
        if (cancelled) return;
        setStatus(body.status);
        if (body.status === "active") router.push("/dashboard");
      } catch {
        // Transient network hiccup — the next tick retries.
      }
    }

    poll();
    const pollInterval = setInterval(poll, 2000);
    const clock = setInterval(() => setElapsedSeconds((s) => s + 2), 2000);
    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      clearInterval(clock);
    };
  }, [claimId, router]);

  if (!claimId) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-slate">Missing claim reference.</p>
        <Link href="/territories" className="font-medium text-signal-orange hover:underline">
          Back to Territory Explorer
        </Link>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold text-charcoal">Reservation expired</h1>
        <p className="mt-2 text-sm text-slate">Your reservation expired before payment completed.</p>
        <Link href="/territories" className="mt-4 inline-block font-medium text-signal-orange hover:underline">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ConfirmingMessage />
      {elapsedSeconds > 30 && (
        <p className="mt-4 text-sm text-slate">
          Still waiting on confirmation from Stripe — this can take a little longer for some payment methods.
        </p>
      )}
    </div>
  );
}

function ConfirmingMessage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-charcoal">Confirming your payment…</h1>
      <p className="mt-2 text-sm text-slate">This usually takes a few seconds. Don&apos;t close this page.</p>
    </>
  );
}
