"use client";

import { useActionState } from "react";
import {
  disconnectCrmConnection,
  testGenericWebhookConnection,
  updateGenericWebhookConnection,
} from "@/lib/actions/settings";
import type { CrmConnection } from "@/lib/data/crm";
import { SubmitButton } from "@/components/submit-button";

export function CrmConnectionManager({ connection }: { connection: CrmConnection }) {
  const [editState, editAction] = useActionState(updateGenericWebhookConnection, undefined);
  const [testState, testAction] = useActionState(testGenericWebhookConnection, undefined);
  const [disconnectState, disconnectAction] = useActionState(disconnectCrmConnection, undefined);
  const isConnected = connection.status === "connected";

  return (
    <div className="mt-4 space-y-3 border-t border-light-grey pt-4">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-charcoal">
          <span>Edit connection</span>
          <span className="rounded-lg bg-soft-surface px-2 py-1 text-slate transition group-open:rotate-180">⌄</span>
        </summary>
        <form action={editAction} className="mt-3 space-y-3 rounded-xl bg-soft-surface p-3">
          <input type="hidden" name="connectionId" value={connection.id} />
          <label className="block text-[11px] font-semibold text-slate">Connection name<input name="label" required defaultValue={connection.label} className="mt-1 w-full rounded-lg border border-light-grey bg-white px-2.5 py-2 text-xs font-normal text-charcoal focus:border-signal-orange focus:outline-none" /></label>
          <label className="block text-[11px] font-semibold text-slate">HTTPS webhook URL<input name="webhookUrl" required type="url" defaultValue={connection.webhook_url ?? ""} className="mt-1 w-full rounded-lg border border-light-grey bg-white px-2.5 py-2 text-xs font-normal text-charcoal focus:border-signal-orange focus:outline-none" /></label>
          <label className="block text-[11px] font-semibold text-slate">Secret reference <span className="font-normal">(optional)</span><input name="secretRef" defaultValue={connection.secret_ref ?? ""} placeholder="Managed secret reference" className="mt-1 w-full rounded-lg border border-light-grey bg-white px-2.5 py-2 text-xs font-normal text-charcoal focus:border-signal-orange focus:outline-none" /></label>
          <div className="flex flex-wrap items-center gap-2"><SubmitButton pendingText="Saving…" className="rounded-lg bg-charcoal px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Save changes</SubmitButton>{editState?.error && <span className="text-[11px] text-danger">{editState.error}</span>}{editState?.success && <span className="text-[11px] text-success">Saved. Test the connection before sending leads.</span>}</div>
        </form>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <form action={testAction}>
          <input type="hidden" name="connectionId" value={connection.id} />
          <SubmitButton pendingText="Testing…" className="rounded-lg border border-light-grey bg-white px-3 py-2 text-xs font-semibold text-charcoal hover:border-signal-orange/40 disabled:opacity-60">{isConnected ? "Test connection" : "Test & connect"}</SubmitButton>
        </form>
        <form action={disconnectAction}>
          <input type="hidden" name="connectionId" value={connection.id} />
          <SubmitButton pendingText="Disconnecting…" className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-60">Disconnect</SubmitButton>
        </form>
      </div>
      {(testState?.error || disconnectState?.error) && <p className="text-[11px] text-danger">{testState?.error ?? disconnectState?.error}</p>}
      {testState?.success && <p className="text-[11px] text-success">Connection verified. Purchased leads can now be sent here.</p>}
      {disconnectState?.success && <p className="text-[11px] text-success">Disconnected. Existing delivery history is retained.</p>}
    </div>
  );
}
