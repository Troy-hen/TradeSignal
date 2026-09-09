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
    <form action={formAction} className="w-full space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex min-h-[88px] items-start gap-3 rounded-2xl bg-soft-surface p-4 text-sm text-charcoal">
          <input type="checkbox" name="channelEmail" defaultChecked={channelEmail} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6A00]" />
          <span>
            <span className="block font-semibold">Email notifications</span>
            <span className="mt-1 block text-xs leading-5 text-slate">Allow MyTradeBox to send opportunity alerts and scheduled digests to your billing email.</span>
          </span>
        </label>

        <div className="rounded-2xl border border-light-grey p-4">
          <label htmlFor="digestFrequency" className="mb-2 block text-sm font-medium text-charcoal">
            Digest frequency
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
          <p className="mt-2 text-xs leading-5 text-slate">Used for matches below your instant-alert score threshold.</p>
        </div>

        <div className="rounded-2xl border border-light-grey p-4">
          <label htmlFor="instantAlertMinScore" className="mb-2 block text-sm font-medium text-charcoal">
            Instant alert score threshold
          </label>
          <div className="flex items-center gap-3">
            <input
              id="instantAlertMinScore"
              name="instantAlertMinScore"
              type="number"
              min={0}
              max={100}
              defaultValue={instantAlertMinScore}
              className="w-28 rounded-xl border border-light-grey px-4 py-3 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
            />
            <span className="text-xs font-medium text-slate">0–100</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate">Opportunities at or above this score are sent immediately.</p>
        </div>

        <div className="rounded-2xl border border-light-grey p-4">
          <label htmlFor="digestMinScore" className="mb-2 block text-sm font-medium text-charcoal">
            Digest minimum score
          </label>
          <div className="flex items-center gap-3">
            <input
              id="digestMinScore"
              name="digestMinScore"
              type="number"
              min={0}
              max={100}
              defaultValue={digestMinScore}
              className="w-28 rounded-xl border border-light-grey px-4 py-3 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
            />
            <span className="text-xs font-medium text-slate">0–100</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate">Only matches at or above this score appear in scheduled digests.</p>
        </div>

        <label className="flex min-h-[104px] items-start gap-3 rounded-2xl bg-soft-surface p-4 text-sm text-charcoal">
          <input type="checkbox" name="approvalAlertsEnabled" defaultChecked={approvalAlertsEnabled} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6A00]" />
          <span>
            <span className="block font-semibold">Planning approval alerts</span>
            <span className="mt-1 block text-xs leading-5 text-slate">Alert me immediately when a matched planning application is approved, regardless of digest timing.</span>
          </span>
        </label>

        <label className="flex min-h-[104px] items-start gap-3 rounded-2xl border border-signal-orange/20 bg-signal-orange/[0.05] p-4 text-sm text-charcoal">
          <input type="checkbox" name="nearbyOpportunityAlertsEnabled" defaultChecked={nearbyOpportunityAlertsEnabled} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6A00]" />
          <span>
            <span className="block font-semibold">Nearby opportunity alerts</span>
            <span className="mt-1 block text-xs leading-5 text-slate">Show and email a weekly digest of available districts within roughly 20 miles of territory you already own. Off by default.</span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-light-grey pt-5">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:opacity-60"
        >
          Save notification preferences
        </SubmitButton>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.success && <p className="text-sm text-success">Saved.</p>}
      </div>
    </form>
  );
}
