"use client";

import { useActionState } from "react";
import { upsertLeadAlertRule } from "@/lib/actions/settings";
import type { AlertRule } from "@/lib/data/crm";
import { SubmitButton } from "@/components/submit-button";

export function LeadAlertRuleForm({ rule }: { rule: AlertRule | null }) {
  const [state, formAction] = useActionState(upsertLeadAlertRule, undefined);
  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-signal-orange/20 bg-signal-orange/[0.04] p-4 sm:p-5">
      {rule?.id && <input type="hidden" name="id" value={rule.id} />}
      <div>
        <p className="text-sm font-semibold text-charcoal">Hot lead alert rule</p>
        <p className="mt-1 text-xs leading-5 text-slate">The banner stays hot-only and unpurchased. Use this rule to control which hot opportunities are eligible for email delivery as your signal sources expand.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-charcoal">
          Rule name
          <input name="name" defaultValue={rule?.name ?? "Hot leads"} className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" />
        </label>
        <label className="text-sm font-medium text-charcoal">
          Minimum score
          <input name="minScore" type="number" min={0} max={100} defaultValue={Math.round(Number(rule?.min_score ?? 90))} className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" />
        </label>
        <label className="text-sm font-medium text-charcoal">
          Email cadence
          <select name="cadence" defaultValue={rule?.cadence ?? "instant"} className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15">
            <option value="instant">Instant</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-charcoal">Signal families (optional)<input name="signalFamilies" defaultValue={rule?.signal_families.join(", ") ?? ""} placeholder="procurement, expansion" className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm placeholder:text-slate/50 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /><span className="mt-1 block text-xs font-normal text-slate">Comma separated.</span></label>
        <label className="text-sm font-medium text-charcoal">Postcode districts (optional)<input name="postcodeDistricts" defaultValue={rule?.postcode_districts.join(", ") ?? ""} placeholder="M1, LS1, B1" className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm placeholder:text-slate/50 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /><span className="mt-1 block text-xs font-normal text-slate">Leave blank for all covered areas.</span></label>
        <label className="text-sm font-medium text-charcoal">Buying windows (optional)<input name="buyingWindows" defaultValue={rule?.buying_windows.join(", ") ?? ""} placeholder="0–30 days, 31–90 days" className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm placeholder:text-slate/50 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /><span className="mt-1 block text-xs font-normal text-slate">Use the windows returned by ingestion.</span></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-signal-orange/15 pt-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal"><input type="checkbox" name="channelEmail" defaultChecked={rule?.channels.includes("email") ?? true} className="h-4 w-4 accent-[#FF6A00]" /> Send matching alerts by email</label>
        <div className="flex flex-wrap items-center gap-3"><SubmitButton pendingText="Saving…" className="rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:opacity-60">Save alert rule</SubmitButton>{state?.error && <p className="text-sm text-danger">{state.error}</p>}{state?.success && <p className="text-sm text-success">Saved.</p>}</div>
      </div>
    </form>
  );
}
