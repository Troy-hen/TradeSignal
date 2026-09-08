"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ConfirmingClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-16 text-center">
          <ConfirmingMessage isDemo={false} />
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
  const planId = searchParams.get("plan");
  const referenceId = claimId ?? planId;
  const isDemo = searchParams.get("demo") === "1";
  const [status, setStatus] = useState("checking");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!referenceId) return;
    let cancelled = false;

    async function poll() {
      try {
        const planQuery = planId ? \`?plan=\${encodeURIComponent(planId)}\` : "";
        const res = await fetch(\`/api/territory-claims/\${referenceId}/status\${planQuery}\`, { cache: "no-store" });
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
  }, [planId, referenceId, router]);

  if (!referenceId) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-slate">Missing coverage reference.</p>
        <Link href="/coverage" className="font-medium text-signal-orange hover:underline">
          Back to Coverage
        </Link>
      </div>
    );
  }

  if (status === "expired" || status === "cancelled") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold text-charcoal">Coverage reservation expired</h1>
        <p className="mt-2 text-sm text-slate">Your reservation expired before payment completed.</p>
        <Link href="/coverage" className="mt-4 inline-block font-medium text-signal-orange hover:underline">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ConfirmingMessage isDemo={isDemo} />
      {elapsedSeconds > 30 && (
        <p className="mt-4 text-sm text-slate">
          {isDemo
            ? "Demo activation is taking a little longer than expected. You can keep this page open."
            : "Still waiting on confirmation from Stripe — this can take a little longer for some payment methods."}
        </p>
      )}
    </div>
  );
}

function ConfirmingMessage({ isDemo }: { isDemo: boolean }) {
  return (
    <>
      <h1 className="text-xl font-semibold text-charcoal">
        {isDemo ? "Activating your coverage…" : "Confirming your payment…"}
      </h1>
      <p className="mt-2 text-sm text-slate">
        {isDemo ? "Your coverage is being activated. Don’t close this page." : "This usually takes a few seconds. Don’t close this page."}
      </p>
    </>
  );
}
