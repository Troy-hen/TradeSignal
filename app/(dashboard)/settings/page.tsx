import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { CompanyDetailsForm } from "@/components/company-details-form";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";

export default async function SettingsPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const canEdit = company.role === "owner" || company.role === "admin";

  const [{ data: companyRow }, { data: prefs }] = await Promise.all([
    supabase.from("companies").select("trading_name, billing_email").eq("id", company.id).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("company_id", company.id).is("user_id", null).maybeSingle(),
  ]);

  return (
    <div className="space-y-8">
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

      <section className="rounded-3xl border border-light-grey bg-soft-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Email delivery</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Your notification inbox</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
          Sent opportunity alerts, announcements and follow-up reminders are kept together in Notifications, alongside the reminders that are due next.
        </p>
      </section>
    </div>
  );
}
