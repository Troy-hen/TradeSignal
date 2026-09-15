"use client";

import { useActionState, useState } from "react";
import { saveCrmFieldMappings } from "@/lib/actions/settings";
import type { CrmFieldMapping } from "@/lib/data/crm";
import { SubmitButton } from "@/components/submit-button";

export function CrmFieldMappingForm({ connectionId, mappings }: { connectionId: string; mappings: CrmFieldMapping[] }) {
  const [state, formAction] = useActionState(saveCrmFieldMappings, undefined);
  const [rows, setRows] = useState(mappings.map((mapping) => ({ everroField: mapping.everro_field, remoteField: mapping.remote_field })));
  return (
    <form action={(formData) => { formData.set("mappings", JSON.stringify(rows)); formAction(formData); }} className="mt-4 border-t border-light-grey pt-4">
      <input type="hidden" name="connectionId" value={connectionId} />
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">Field mapping</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row, index) => <label key={row.everroField} className="text-[11px] font-semibold text-slate">{row.everroField}{mappings[index]?.required && <span className="ml-1 text-signal-orange">*</span>}<input value={row.remoteField} onChange={(event) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, remoteField: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-light-grey bg-white px-2.5 py-2 text-xs font-normal text-charcoal focus:border-signal-orange focus:outline-none" /></label>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><SubmitButton pendingText="Saving…" className="rounded-lg bg-soft-surface px-3 py-2 text-xs font-semibold text-charcoal hover:bg-light-grey disabled:opacity-60">Save mapping</SubmitButton>{state?.error && <span className="text-xs text-danger">{state.error}</span>}{state?.success && <span className="text-xs text-success">Saved</span>}</div>
    </form>
  );
}
