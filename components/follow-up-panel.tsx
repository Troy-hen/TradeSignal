"use client";

import { useState, useTransition } from "react";
import {
  cancelLeadFollowUp,
  completeLeadFollowUp,
  createLeadFollowUp,
  type LeadFollowUp,
} from "@/lib/actions/lead-follow-ups";

export function FollowUpPanel({
  leadMatchId,
  opportunityId,
  initialFollowUps,
}: {
  leadMatchId: string;
  opportunityId: string;
  initialFollowUps: LeadFollowUp[];
}) {
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addFollowUp() {
    if (!dueAt) {
      setError("Choose a date and time for the reminder.");
      return;
    }

    setError(null);
    const dueIso = new Date(dueAt).toISOString();
    startTransition(async () => {
      const result = await createLeadFollowUp({
        leadMatchId,
        opportunityId,
        dueAt: dueIso,
        note: note.trim() || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) setFollowUps((current) => [...current, result.data as LeadFollowUp].sort(sortFollowUps));
      setDueAt("");
      setNote("");
    });
  }

  function updateFollowUp(id: string, action: "complete" | "cancel") {
    setError(null);
    startTransition(async () => {
      const result =
        action === "complete"
          ? await completeLeadFollowUp({ followUpId: id, opportunityId })
          : await cancelLeadFollowUp({ followUpId: id, opportunityId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setFollowUps((current) =>
        current.map((followUp) =>
          followUp.id === id
            ? {
                ...followUp,
                status: action === "complete" ? "completed" : "cancelled",
                completed_at: action === "complete" ? new Date().toISOString() : followUp.completed_at,
              }
            : followUp,
        ),
      );
    });
  }

  const openFollowUps = followUps.filter((followUp) => followUp.status === "open");
  const closedFollowUps = followUps.filter((followUp) => followUp.status !== "open");

  return (
    <div>
      <p className="mb-4 text-sm text-slate">Set a next action so good opportunities do not disappear from the pipeline.</p>

      {openFollowUps.length > 0 && (
        <ul className="space-y-2">
          {openFollowUps.map((followUp) => (
            <li key={followUp.id} className="flex flex-col gap-3 rounded-2xl border border-light-grey bg-soft-surface p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-charcoal">Due {formatUtc(followUp.due_at)}</p>
                {followUp.note && <p className="mt-1 text-xs leading-5 text-slate">{followUp.note}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => updateFollowUp(followUp.id, "complete")}
                  disabled={isPending}
                  className="rounded-lg border border-success/30 px-3 py-2 text-xs font-semibold text-success transition hover:bg-success/10 disabled:opacity-60"
                >
                  Complete
                </button>
                <button
                  type="button"
                  onClick={() => updateFollowUp(followUp.id, "cancel")}
                  disabled={isPending}
                  className="rounded-lg border border-light-grey px-3 py-2 text-xs font-semibold text-slate transition hover:bg-white disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 rounded-2xl border border-light-grey p-3 sm:grid-cols-[190px_minmax(0,1fr)_auto] sm:items-end">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">Remind me</span>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="mt-2 w-full rounded-xl border border-light-grey px-3 py-2.5 text-sm text-charcoal outline-none focus:border-signal-orange"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">Note</span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Call after decision date"
            maxLength={2000}
            className="mt-2 w-full rounded-xl border border-light-grey px-3 py-2.5 text-sm text-charcoal outline-none focus:border-signal-orange"
          />
        </label>
        <button
          type="button"
          onClick={addFollowUp}
          disabled={isPending}
          className="rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Add reminder"}
        </button>
      </div>

      {closedFollowUps.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-slate">Show completed and cancelled reminders</summary>
          <ul className="mt-2 space-y-2">
            {closedFollowUps.map((followUp) => (
              <li key={followUp.id} className="flex items-center justify-between gap-3 rounded-xl bg-soft-surface px-3 py-2 text-xs text-slate">
                <span>{formatUtc(followUp.due_at)}{followUp.note ? " · " + followUp.note : ""}</span>
                <span className="font-semibold capitalize">{followUp.status}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

function sortFollowUps(left: LeadFollowUp, right: LeadFollowUp): number {
  return left.due_at.localeCompare(right.due_at);
}

function formatUtc(value: string): string {
  return value.replace("T", " ").slice(0, 16) + " UTC";
}
