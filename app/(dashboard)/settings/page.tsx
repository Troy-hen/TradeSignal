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
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-charcoal">Settings</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-charcoal">Company details</h2>
        {canEdit ? (
          <div className="mt-4">
            <CompanyDetailsForm tradingName={companyRow?.trading_name ?? ""} billingEmail={companyRow?.billing_email ?? ""} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate">Only company owners/admins can edit these details.</p>
        )}
      </section>

      <section className="mt-10 border-t border-light-grey pt-8">
        <h2 className="text-lg font-semibold text-charcoal">Notification preferences</h2>
        <p className="mt-1 text-sm text-slate">Applies company-wide unless a team member sets their own preference.</p>
        {canEdit ? (
          <div className="mt-4">
            <NotificationPreferencesForm
              channelEmail={prefs?.channel_email ?? true}
              digestFrequency={prefs?.digest_frequency ?? "daily"}
              instantAlertMinScore={prefs?.instant_alert_min_score ?? 90}
              digestMinScore={prefs?.digest_min_score ?? 0}
              approvalAlertsEnabled={prefs?.approval_alerts_enabled ?? true}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate">Only company owners/admins can edit these preferences.</p>
        )}
      </section>
    </div>
  );
}
