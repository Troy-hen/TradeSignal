"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { pushLeadToCrm, type CrmPushState } from "@/lib/actions/crm";
import type { CrmConnection } from "@/lib/data/crm";

export function CrmPushAction({ compact = false, leadUnlockId, connections = [] }: { compact?: boolean; leadUnlockId?: string; connections?: CrmConnection[] }) {
  const connected = connections.filter((connection) => connection.status === "connected");
  if (!leadUnlockId || connected.length === 0) {
    return (
      <Link href="/settings#crm-connections" title="Connect or choose your CRM in Settings" className={compact ? "inline-flex items-center justify-center rounded-xl border border-light-grey bg-white px-3 py-2 text-xs font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange" : "inline-flex items-center justify-center rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange"}>
        {connected.length === 0 ? "Connect CRM" : "Push to CRM"} <span className="ml-2" aria-hidden="true">↗</span>
      </Link>
    );
  }
  return <CrmPushForm compact={compact} leadUnlockId={leadUnlockId} connections={connected} />;
}

function CrmPushForm({ compact, leadUnlockId, connections }: { compact: boolean; leadUnlockId: string; connections: CrmConnection[] }) {
  const [state, formAction, pending] = useActionState<CrmPushState, FormData>(pushLeadToCrm, undefined);
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  useEffect(() => { if (state?.success) setOpen(false); }, [state?.success]);
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={compact ? "inline-flex items-center justify-center rounded-xl border border-light-grey bg-white px-3 py-2 text-xs font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange" : "inline-flex items-center justify-center rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange"}>{state?.status === "already_sent" ? "Sent to CRM" : "Push to CRM"} <span className="ml-2" aria-hidden="true">↗</span></button>;
  }
  return (
    <form action={formAction} className="flex min-w-[230px] flex-wrap items-center gap-2 rounded-xl border border-light-grey bg-white p-2 shadow-sm">
      <input type="hidden" name="leadUnlockId" value={leadUnlockId} />
      <label className="sr-only" htmlFor={`crm-${leadUnlockId}`}>CRM connection</label>
      <select id={`crm-${leadUnlockId}`} name="connectionId" value={connectionId} onChange={(event) => setConnectionId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-light-grey bg-white px-2 py-2 text-xs font-semibold text-charcoal focus:border-signal-orange focus:outline-none">
        {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.label}</option>)}
      </select>
      <button type="submit" disabled={pending} className="rounded-lg bg-charcoal px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Sending…" : "Send"}</button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate hover:text-charcoal">Cancel</button>
      {state?.error && <p className="basis-full px-1 text-[11px] leading-4 text-danger">{state.error}</p>}
    </form>
  );
}
