import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { NotificationInbox, type NotificationInboxRow } from "@/components/notification-inbox";

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

  return (
    <div className="min-w-0 space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-charcoal p-6 text-white shadow-xl shadow-charcoal/10 sm:p-9"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Alerts</p><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Keep the marketplace moving.</h1><p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">New opportunity alerts, follow-up reminders and delivery history live here. The marketplace remains the place to discover and unlock leads.</p></div><Link href="/opportunities" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Open marketplace <span className="ml-2">→</span></Link></div><div className="mt-8 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3"><AlertStat label="Follow-ups due" value={String(reminders.length)} /><AlertStat label="Delivery events" value={String(notifications.length)} /><AlertStat label="Marketplace" value="Live" /></div></section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Next actions</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Follow-up reminders.</h2><p className="mt-2 text-sm leading-6 text-slate">Reminders you set from a lead brief stay here until the work is done.</p><div className="mt-6">{reminders.length === 0 ? <div className="rounded-2xl border border-dashed border-light-grey bg-soft-surface p-5 text-sm leading-6 text-slate">No open reminders. Open a marketplace opportunity and add a follow-up when it is worth revisiting.</div> : <ul className="space-y-3">{reminders.map((reminder) => <li key={reminder.id} className="rounded-2xl border border-light-grey bg-soft-surface p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-charcoal">Lead follow-up</p><p className="mt-1 text-xs text-slate">Due {formatDateTime(reminder.due_at)}</p>{reminder.note && <p className="mt-3 text-sm leading-6 text-slate">{reminder.note}</p>}</div><Link href="/opportunities" className="shrink-0 text-xs font-semibold text-signal-orange">Open feed →</Link></div></li>)}</ul>}</div></section><section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Email delivery</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Your alert history.</h2></div><Link href="/settings" className="text-xs font-semibold text-signal-orange">Manage alerts →</Link></div><div className="mt-6"><NotificationInbox notifications={notifications} /></div></section></div>
    </div>
  );
}

function AlertStat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p></div>; }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
