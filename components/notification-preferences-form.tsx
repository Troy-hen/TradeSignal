"use client";

import { useActionState } from "react";
import { updateNotificationPreferences } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/submit-button";

export function NotificationPreferencesForm({
  channelEmail,
  digestFrequency,
  instantAlertMinScore,
  digestMinScore,
  approvalAlertsEnabled,
  nearbyOpportunityAlertsEnabled,
}: {
  channelEmail: boolean;
  digestFrequency: string;
  instantAlertMinScore: number;
  digestMinScore: number;
  approvalAlertsEnabled: boolean;
  nearbyOpportunityAlertsEnabled: boolean;
}) {
  const [state, formAction] = useActionState(updateNotificationPreferences, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <label className="flex items-center gap-3 rounded-xl bg-soft-surface p-4 text-sm font-medium text-charcoal">
        <input type="checkbox" name="channelEmail" defaultChecked={channelEmail} className="h-4 w-4 accent-[#FF6A00]" />
        Email notifications
      </label>

      <div>
        <label htmlFor="digestFrequency" className="mb-1 block text-sm font-medium text-charcoal">
          Digest frequency (for matches below the instant-alert threshold)
        </label>
        <select
          id="digestFrequency"
          name="digestFrequency"
          defaultValue={digestFrequency}
          className="w-full rounded-xl border border-light-grey px-4 py-3 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
        >
          <option value="instant">Instant</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <div>
        <label htmlFor="instantAlertMinScore" className="mb-1 block text-sm font-medium text-charcoal">
          Instant alert score threshold (0–100)
        </label>
        <input
          id="instantAlertMinScore"
          name="instantAlertMinScore"
          type="number"
          min={0}
          max={100}
          defaultValue={instantAlertMinScore}
          className="w-full rounded-xl border border-light-grey px-4 py-3 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
        />
        <p className="mt-1 text-xs text-slate">Opportunities scoring at or above this get an email immediately.</p>
      </div>

      <div>
        <label htmlFor="digestMinScore" className="mb-1 block text-sm font-medium text-charcoal">
          Digest minimum score (0–100)
        </label>
        <input
          id="digestMinScore"
          name="digestMinScore"
          type="number"
          min={0}
          max={100}
          defaultValue={digestMinScore}
          className="w-full rounded-xl border border-light-grey px-4 py-3 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
        />
        <p className="mt-1 text-xs text-slate">Only matches at or above this score are included in your digest.</p>
      </div>

      <label className="flex items-center gap-3 rounded-xl bg-soft-surface p-4 text-sm font-medium text-charcoal">
        <input type="checkbox" name="approvalAlertsEnabled" defaultChecked={approvalAlertsEnabled} className="h-4 w-4 accent-[#FF6A00]" />
        Always alert me instantly when a matched application is approved
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-signal-orange/20 bg-signal-orange/[0.05] p-4 text-sm text-charcoal">
        <input type="checkbox" name="nearbyOpportunityAlertsEnabled" defaultChecked={nearbyOpportunityAlertsEnabled} className="mt-0.5 h-4 w-4 accent-[#FF6A00]" />
        <span>
          <span className="block font-medium">Nearby opportunity alerts</span>
          <span className="mt-1 block text-xs leading-5 text-slate">Show and email a weekly digest of available districts within roughly 20 miles of your owned territories. Off by default.</span>
        </span>
      </label>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">Saved.</p>}
      <SubmitButton
        pendingText="Saving…"
        className="rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:opacity-60"
      >
        Save notification preferences
      </SubmitButton>
    </form>
  );
}
