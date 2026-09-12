"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(updatePassword, undefined);

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-charcoal">Choose a new password</h1>
      <p className="mb-6 text-sm text-slate">Must be at least 8 characters.</p>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-charcoal">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none"
          />
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
      </form>
    </>
  );
}
