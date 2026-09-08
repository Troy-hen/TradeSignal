import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { CompanyDetailsForm } from "@/components/company-details-form";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";

export default async function SettingsPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const canEdit = company.role === "owner" || company.role === "admin";

  const [{ data: companyRow }, { data: prefs }, { data: notifications }] = await Promise.all([
    supabase.from("companies").select("trading_name, billing_email").eq("id", company.id).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("company_id", company.id).is("user_id", null).maybeSingle(),
    supabase
      .from("notification_log")
      .select("id, notification_type, status, subject, sent_at, created_at, error_message")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Account</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Settings.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">Keep your company details and opportunity alerts up to date.</p>
      </div>

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Company profile</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Business details</h2>
        <p className="mt-2 text-sm leading-6 text-slate">These details are used for billing and account communications.</p>
        {canEdit ? (
          <div className="mt-6">
            <CompanyDetailsForm tradingName={companyRow?.trading_name ?? ""} billingEmail={companyRow?.billing_email ?? ""} />
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit these details.</p>
        )}
      </section>

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity alerts</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Notification preferences</h2>
        <p className="mt-2 text-sm leading-6 text-slate">Choose how quickly MyTradeBox should bring new signals to you.</p>
        {canEdit ? (
          <div className="mt-6">
            <NotificationPreferencesForm
              channelEmail={prefs?.channel_email ?? true}
              digestFrequency={prefs?.digest_frequency ?? "daily"}
              instantAlertMinScore={prefs?.instant_alert_min_score ?? 90}
              digestMinScore={prefs?.digest_min_score ?? 0}
              approvalAlertsEnabled={prefs?.approval_alerts_enabled ?? true}
            />
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit these preferences.</p>
        )}
      </section>

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Email delivery</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Recent notification activity</h2>
        <p className="mt-2 text-sm leading-6 text-slate">
          MyTradeBox records email send activity here. A Sent status confirms Resend accepted the message; it does not confirm that it was opened.
        </p>
        <div className="mt-6">
          <NotificationActivity notifications={notifications ?? []} />
        </div>
      </section>
    </div>
  );
}

type NotificationRow = {
  id: string;
  notification_type: string;
  status: string;
  subject: string | null;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
};

function NotificationActivity({ notifications }: { notifications: NotificationRow[] }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-light-grey bg-soft-surface p-5 text-sm text-slate">
        No notification emails have been sent yet. New opportunity and account alerts will appear here after delivery is attempted.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-light-grey">
      <ul className="divide-y divide-light-grey">
        {notifications.map((notification) => {
          const status = notificationStatus(notification.status);
          return (
            <li key={notification.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">
                  {notification.subject ?? notificationLabel(notification.notification_type)}
                </p>
                <p className="mt-1 text-xs text-slate">
                  {notificationLabel(notification.notification_type)} · {formatNotificationDate(notification.sent_at ?? notification.created_at)}
                </p>
                {notification.error_message && <p className="mt-1 text-xs text-danger">{notification.error_message}</p>}
              </div>
              <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function notificationLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function notificationStatus(status: string): { label: string; className: string; dot: string } {
  if (status === "sent") return { label: "Sent", className: "bg-success/10 text-success", dot: "bg-success" };
  if (status === "queued") return { label: "Queued", className: "bg-warning/10 text-warning", dot: "bg-warning" };
  return { label: "Failed", className: "bg-danger/10 text-danger", dot: "bg-danger" };
}

function formatNotificationDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
