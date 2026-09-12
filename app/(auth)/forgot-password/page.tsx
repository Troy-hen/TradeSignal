"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [state, formAction] = useActionState(async (prevState: unknown, formData: FormData) => {
    const result = await requestPasswordReset(prevState as never, formData);
    if (!result?.error) setSubmitted(true);
    return result;
  }, undefined);

  if (submitted) {
    return (
      <>
        <h1 className="mb-1 text-xl font-semibold text-charcoal">Check your email</h1>
        <p className="text-sm text-slate">
          If an account exists for that address, we&apos;ve sent a link to reset your password.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-charcoal">Reset your password</h1>
      <p className="mb-6 text-sm text-slate">We&apos;ll email you a link to choose a new one.</p>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-charcoal">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none"
          />
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate">
        <Link href="/login" className="font-medium text-signal-orange hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
