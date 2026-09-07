"use client";

import { useActionState } from "react";
import { createCompany } from "@/lib/actions/company";
import { SubmitButton } from "@/components/submit-button";

export default function OnboardingCompanyPage() {
  const [state, formAction] = useActionState(createCompany, undefined);

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-charcoal">Tell us about your business</h1>
      <p className="mb-6 text-sm text-slate">
        This takes a few seconds — you can add more detail later in Settings.
      </p>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="tradingName" className="mb-1 block text-sm font-medium text-charcoal">
            Company name
          </label>
          <input
            id="tradingName"
            name="tradingName"
            type="text"
            required
            placeholder="e.g. Norfolk Roofing Ltd"
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
            placeholder="accounts@yourcompany.co.uk"
            className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none"
          />
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton pendingText="Setting up…">Continue</SubmitButton>
      </form>
    </>
  );
}
