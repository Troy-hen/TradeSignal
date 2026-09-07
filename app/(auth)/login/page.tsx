"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage() {
  const [state, formAction] = useActionState(signIn, undefined);

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-charcoal">Welcome back</h1>
      <p className="mb-6 text-sm text-slate">Sign in to your TradeSignal account</p>
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
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-charcoal">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-signal-orange hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none"
          />
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate">
        New to TradeSignal?{" "}
        <Link href="/signup" className="font-medium text-signal-orange hover:underline">
          Create a free account
        </Link>
      </p>
    </>
  );
}
