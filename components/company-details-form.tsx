"use client";

import { useActionState } from "react";
import { updateCompanyDetails } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/submit-button";

export function CompanyDetailsForm({ tradingName, billingEmail }: { tradingName: string; billingEmail: string }) {
  const [state, formAction] = useActionState(updateCompanyDetails, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor="tradingName" className="mb-1 block text-sm font-medium text-charcoal">
          Company name
        </label>
        <input
          id="tradingName"
          name="tradingName"
          type="text"
          required
          defaultValue={tradingName}
          className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="billingEmail" className="mb-1 block text-sm font-medium text-charcoal">
          Billing email
        </label>
        <input
          id="billingEmail"
          name="billingEmail"
          type="email"
          required
          defaultValue={billingEmail}
          className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none"
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">Saved.</p>}
      <SubmitButton
        pendingText="Saving…"
        className="rounded-md bg-signal-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
      >
        Save company details
      </SubmitButton>
    </form>
  );
}
