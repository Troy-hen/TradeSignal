import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { CompanyDetailsForm } from "@/components/company-details-form";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { AppPageHeader } from "@/components/app-page-header";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ coverage_plan?: string; coverage_mode?: string }> }) {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const { coverage_plan: coveragePlan, coverage_mode: coverageMode } = await searchParams;
  const canEdit = company.role === "owner" || company.role === "admin";
  const [{ data: companyRow }, { data: prefs }] = await Promise.all([
    supabase.from("companies").select("trading_name, billing_email").eq("id", company.id).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("company_id", company.id).is("user_id", null).maybeSingle(),
  ]);

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader eyebrow="Account" title="Account settings." description="Keep your company details and opportunity alert preferences up to date." actions={<Link href="/coverage#profile" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Plan & profile <span className="ml-2">→</span></Link>} />
      {coveragePlan && <section className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.055] p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Coverage setup in progress</p><h2 className="mt-2 text-xl font-semibold text-charcoal">{humanize(coveragePlan)} · {humanize(coverageMode ?? "coverage")}</h2><p className="mt-2 text-sm leading-6 text-slate">Complete your business context, then return to Coverage to finish geography setup. Sources remain included in every plan.</p><Link href="/coverage" className="mt-4 inline-flex text-sm font-semibold text-signal-orange">Return to coverage →</Link></section>}
      <section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Company details</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Business details</h2><p className="mt-2 text-sm leading-6 text-slate">Used for billing and account communications.</p>{canEdit ? <div className="mt-6 min-w-0"><CompanyDetailsForm tradingName={companyRow?.trading_name ?? ""} billingEmail={companyRow?.billing_email ?? ""} /></div> : <p className="mt-5 rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit these details.</p>}</section>
      <section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity alerts</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Notification preferences</h2><p className="mt-2 text-sm leading-6 text-slate">Choose how quickly the marketplace should bring new relevant signals to you.</p>{canEdit ? <div className="mt-6 min-w-0"><NotificationPreferencesForm channelEmail={prefs?.channel_email ?? true} digestFrequency={prefs?.digest_frequency ?? "daily"} instantAlertMinScore={prefs?.instant_alert_min_score ?? 90} digestMinScore={prefs?.digest_min_score ?? 0} approvalAlertsEnabled={prefs?.approval_alerts_enabled ?? true} nearbyOpportunityAlertsEnabled={prefs?.nearby_opportunity_alerts_enabled ?? false} /></div> : <p className="mt-5 rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit these preferences.</p>}</section>
    </div>
  );
}

function humanize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
