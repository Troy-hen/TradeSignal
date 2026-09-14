import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { CompanyDetailsForm } from "@/components/company-details-form";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { AppPageHeader } from "@/components/app-page-header";

export default async function SettingsPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const canEdit = company.role === "owner" || company.role === "admin";
  const [{ data: companyRow }, { data: prefs }] = await Promise.all([
    supabase.from("companies").select("trading_name, billing_email").eq("id", company.id).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("company_id", company.id).is("user_id", null).maybeSingle(),
  ]);

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader eyebrow="Account" title="Account settings." description="Manage company details, CRM connections and opportunity alert preferences in one place." actions={<Link href="/coverage#profile" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Plan & profile <span className="ml-2">→</span></Link>} />
      <section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Company details</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Business details</h2><p className="mt-2 text-sm leading-6 text-slate">Used for billing and account communications.</p>{canEdit ? <div className="mt-6 min-w-0"><CompanyDetailsForm tradingName={companyRow?.trading_name ?? ""} billingEmail={companyRow?.billing_email ?? ""} /></div> : <p className="mt-5 rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit these details.</p>}</section>
      <CrmConnections canEdit={canEdit} />
      <section className="min-w-0 rounded-3xl border border-light-grey bg-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity alerts</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Notification preferences</h2><p className="mt-2 text-sm leading-6 text-slate">Choose how quickly the marketplace should bring new relevant signals to you.</p>{canEdit ? <div className="mt-6 min-w-0"><NotificationPreferencesForm channelEmail={prefs?.channel_email ?? true} digestFrequency={prefs?.digest_frequency ?? "daily"} instantAlertMinScore={prefs?.instant_alert_min_score ?? 90} digestMinScore={prefs?.digest_min_score ?? 0} approvalAlertsEnabled={prefs?.approval_alerts_enabled ?? true} nearbyOpportunityAlertsEnabled={prefs?.nearby_opportunity_alerts_enabled ?? false} /></div> : <p className="mt-5 rounded-xl bg-soft-surface p-4 text-sm text-slate">Only company owners and admins can edit these preferences.</p>}</section>
    </div>
  );
}

function CrmConnections({ canEdit }: { canEdit: boolean }) {
  const connectors = [
    { name: "HubSpot", detail: "Company, contact and deal handoff with evidence attached." },
    { name: "Pipedrive", detail: "Organisation, person and deal creation for purchased leads." },
    { name: "Generic webhook", detail: "Send a controlled opportunity payload into another CRM or workflow." },
  ];
  return <section id="crm-connections" className="scroll-mt-6 rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.035] p-5 sm:p-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">CRM connections</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">Connect and manage lead handoff.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate">CRM setup lives here. Purchased lead cards and full briefs expose only the lightweight Push to CRM action.</p></div><span className="shrink-0 rounded-full border border-light-grey bg-white px-3 py-1.5 text-xs font-semibold text-slate">No CRM connected</span></div><div className="mt-6 grid gap-3 lg:grid-cols-3">{connectors.map((connector) => <article key={connector.name} className="rounded-2xl border border-light-grey bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-charcoal">{connector.name}</h3><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate">Not connected</span></div><p className="mt-2 text-xs leading-5 text-slate">{connector.detail}</p><p title={canEdit ? "Available when the provider API is configured" : "Only company owners and admins can connect a CRM"} className="mt-4 rounded-xl border border-light-grey bg-soft-surface px-3 py-2 text-center text-xs font-semibold text-slate/70">{canEdit ? "Provider setup required" : "Admin access required"}</p></article>)}</div><div className="mt-5 rounded-2xl border border-white bg-white/80 p-4"><p className="text-sm font-semibold text-charcoal">Connection controls stay out of the lead workflow.</p><p className="mt-1 text-xs leading-5 text-slate">Once a provider is active, this section will own connection status, field mapping, default pipeline, sync history and disconnect controls. CSV export remains available separately from the opportunity list.</p></div></section>;
}

