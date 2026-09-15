import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { NotificationInbox, type NotificationInboxRow } from "@/components/notification-inbox";
import { AppPageHeader } from "@/components/app-page-header";

type ReminderRow = { id: string; lead_match_id: string; due_at: string; note: string | null; status: string };

export default async function NotificationsPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const [{ data: notificationData }, { data: reminderData }] = await Promise.all([
    supabase.from("notification_log").select("id, notification_type, status, subject, sent_at, created_at, error_message, email_html").eq("company_id", company.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("lead_follow_ups").select("id, lead_match_id, due_at, note, status").eq("company_id", company.id).eq("status", "open").order("due_at", { ascending: true }).limit(25),
  ]);
  const notifications = (notificationData ?? []) as NotificationInboxRow[];
  const reminders = (reminderData ?? []) as ReminderRow[];
  const leadMatchIds = reminders.map((reminder) => reminder.lead_match_id);
  const { data: reminderMatches } = leadMatchIds.length > 0
    ? await supabase.from("lead_matches").select("id, application_trade_opportunity_id").in("id", leadMatchIds)
    : { data: [] };
  const opportunityByLeadMatch = new Map((reminderMatches ?? []).map((match) => [match.id, match.application_trade_opportunity_id]));

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader eyebrow="Action centre" title="Follow up on the leads you are working." description="Reminders and delivery history live here. Discovery stays in the Marketplace; purchased briefs remain in Purchased leads." stats={[{ label: "Follow-ups due", value: String(reminders.length), detail: "Next actions" }, { label: "Delivery events", value: String(notifications.length), detail: "Alert history" }, { label: "Marketplace", value: "Live", detail: "New opportunities appear there" }]} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Next actions</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Follow-up reminders.</h2><p className="mt-2 text-sm leading-6 text-slate">Reminders you set from a purchased lead brief stay here until the work is done.</p><div className="mt-6">{reminders.length === 0 ? <div className="rounded-2xl border border-dashed border-light-grey bg-soft-surface p-5 text-sm leading-6 text-slate">No open reminders. Add a follow-up from a purchased lead when it is worth revisiting.</div> : <ul className="space-y-3">{reminders.map((reminder) => { const opportunityId = opportunityByLeadMatch.get(reminder.lead_match_id); return <li key={reminder.id} className="rounded-2xl border border-light-grey bg-soft-surface p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-charcoal">Lead follow-up</p><p className="mt-1 text-xs text-slate">Due {formatDateTime(reminder.due_at)}</p>{reminder.note && <p className="mt-3 text-sm leading-6 text-slate">{reminder.note}</p>}</div>{opportunityId && <Link href={`/opportunities/${opportunityId}`} className="shrink-0 text-xs font-semibold text-signal-orange">Open lead →</Link>}</div></li>; })}</ul>}</div></section><section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Email delivery</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Your alert history.</h2></div><Link href="/settings" className="text-xs font-semibold text-signal-orange">Manage alert preferences →</Link></div><div className="mt-6"><NotificationInbox notifications={notifications} /></div></section></div>
    </div>
  );
}

function formatDateTime(value: string): string { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
