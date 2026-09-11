import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { CompanyDetailsForm } from "@/components/company-details-form";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { CustomerProfileForm } from "@/components/customer-profile-form";
import { getCustomerProfile } from "@/lib/data/customer-profile";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ coverage_plan?: string; coverage_mode?: string; focus?: string }> }) {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const { coverage_plan: coveragePlan, coverage_mode: coverageMode, focus } = await searchParams;
  const canEdit = company.role === "owner" || company.role === "admin";
  const [{ data: companyRow }, { data: prefs }, profile] = await Promise.all([
    supabase.from("companies").select("trading_name, billing_email").eq("id", company.id).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("company_id", company.id).is("user_id", null).maybeSingle(),
    getCustomerProfile(company.id),
  ]);

  return (
    <div className="min-w-0 space-y-8">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Account</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Business profile.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">Keep your company details, customer profile and opportunity alerts up to date. This context helps the intelligence engine decide what is relevant.</p></div>
      {coveragePlan && <section className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.055] p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Coverage setup in progress</p><h2 className="mt-2 text-xl font-semibold text-charcoal">{humanize(coveragePlan)} · {humanize(coverageMode ?? "coverage")}</h2><p className="mt-2 text-sm leading-6 text-slate">Complete your business context, then return to Coverage to finish geography setup. Sources remain included in every plan.</p><Link href="/coverage" className="mt-4 inline-flex text-sm font-semibold text-signal-orange">Return to coverage →</Link></section>}
      <section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Company details</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Business details</h2><p className="mt-2 text-sm leading-6 text-slate">Used for billing and account communications.</p>{canEdit ? <div className="mt-6 min-w-0"><CompanyDetailsForm tradingName={companyRow?.trading_name ?? ""} billingEmail={companyRow?.billing_email ?? ""} /></div> : <p className="mt-5 rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit these details.</p>}</section>
      <section className="min-w-0 rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.035] p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Customer profile</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Tell the engine what you sell.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Use normal language rather than selecting a legacy trade category. AI turns your description into structured relevance signals across the full marketplace.</p>{canEdit ? <div className="mt-6 min-w-0"><CustomerProfileForm initial={profile} /></div> : <p className="mt-5 rounded-xl bg-white p-4 text-sm text-slate">Only company owners and admins can edit the customer profile.</p>}</section>
      <section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity alerts</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Notification preferences</h2><p className="mt-2 text-sm leading-6 text-slate">Choose how quickly the marketplace should bring new relevant signals to you.</p>{canEdit ? <div className="mt-6 min-w-0"><NotificationPreferencesForm channelEmail={prefs?.channel_email ?? true} digestFrequency={prefs?.digest_frequency ?? "daily"} instantAlertMinScore={prefs?.instant_alert_min_score ?? 90} digestMinScore={prefs?.digest_min_score ?? 0} approvalAlertsEnabled={prefs?.approval_alerts_enabled ?? true} nearbyOpportunityAlertsEnabled={prefs?.nearby_opportunity_alerts_enabled ?? false} /></div> : <p className="mt-5 rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit these preferences.</p>}</section>
      {focus === "profile" && <p className="text-xs text-slate">Profile fields beyond company details will be connected to the customer-profile API as the intelligence engine is enabled.</p>}
    </div>
  );
}

function humanize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
