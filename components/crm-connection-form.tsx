"use client";

import { useActionState } from "react";
import { createGenericWebhookConnection } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/submit-button";

export function CrmConnectionForm() {
  const [state, formAction] = useActionState(createGenericWebhookConnection, undefined);
  return (
    <form action={formAction} className="mt-6 rounded-2xl border border-light-grey bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-charcoal">Add a webhook connection</p>
        <p className="text-xs leading-5 text-slate">Use an HTTPS endpoint from your CRM or automation layer. Everro sends a normalized purchased-lead payload and an idempotency key. Test it from the connection card before sending leads.</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1.4fr_0.8fr_auto] md:items-end">
        <label className="text-xs font-semibold text-charcoal">Connection name<input name="label" required placeholder="My CRM" className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm font-normal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label>
        <label className="text-xs font-semibold text-charcoal">HTTPS webhook URL<input name="webhookUrl" required type="url" placeholder="https://example.com/everro" className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm font-normal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label>
        <label className="text-xs font-semibold text-charcoal">Secret reference <span className="font-normal text-slate">(optional)</span><input name="secretRef" placeholder="Managed secret reference" className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm font-normal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label>
        <SubmitButton pendingText="Saving…" className="rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-charcoal/90 disabled:opacity-60">Save connection</SubmitButton>
      </div>
      {state?.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="mt-3 text-sm text-success">Connection saved. Test it below before sending purchased leads.</p>}
    </form>
  );
}
