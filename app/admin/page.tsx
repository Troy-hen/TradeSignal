import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CompanyRow = { id: string; trading_name: string; billing_email: string; verified: boolean; created_at: string; deleted_at: string | null };
type ContactRow = { id: string; name: string; email: string; company_name: string | null; request_type: string; postcode_district: string | null; status: string; created_at: string };
type IngestionRow = { id: string; provider: string; run_type: string; started_at: string; finished_at: string | null; status: string; applications_fetched: number; applications_created: number; applications_updated: number; errors_count: number };
type NotificationRow = { id: string; notification_type: string; status: string; subject: string | null; error_message: string | null; created_at: string };
type SubscriptionRow = { id: string; company_id: string; status: string; current_period_end: string | null; created_at: string };
type ProductEventRow = { event_name: string; source: string | null; created_at: string };
type ClaimRow = { id: string; company_id: string; status: string };

export default async function AdminOverviewPage() {
  const typed = createAdminClient();
  const db = typed as unknown as SupabaseClient;
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: companiesData }, { data: contactsData }, { data: ingestionData }, { data: notificationData },
    { data: subscriptionsData }, { data: eventsData }, { data: claimsData },
    { count: applications }, { count: opportunities }, { count: matches },
  ] = await Promise.all([
    db.from("companies").select("id, trading_name, billing_email, verified, created_at, deleted_at").order("created_at", { ascending: false }).limit(200),
    db.from("contact_requests").select("id, name, email, company_name, request_type, postcode_district, status, created_at").order("created_at", { ascending: false }).limit(30),
    db.from("ingestion_runs").select("id, provider, run_type, started_at, finished_at, status, applications_fetched, applications_created, applications_updated, errors_count").order("started_at", { ascending: false }).limit(20),
    db.from("notification_log").select("id, notification_type, status, subject, error_message, created_at").order("created_at", { ascending: false }).limit(100),
    db.from("subscriptions").select("id, company_id, status, current_period_end, created_at").order("created_at", { ascending: false }).limit(200),
    db.from("product_events").select("event_name, source, created_at").gte("created_at", monthAgo).order("created_at", { ascending: false }).limit(5000),
    db.from("territory_claims").select("id, company_id, status").limit(5000),
    db.from("planning_applications").select("id", { count: "exact", head: true }),
    db.from("application_trade_opportunities").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.from("lead_matches").select("id", { count: "exact", head: true }),
  ]);

  const companies = (companiesData ?? []) as CompanyRow[];
  const contacts = (contactsData ?? []) as ContactRow[];
  const ingestion = (ingestionData ?? []) as IngestionRow[];
  const notifications = (notificationData ?? []) as NotificationRow[];
  const subscriptions = (subscriptionsData ?? []) as SubscriptionRow[];
  const events = (eventsData ?? []) as ProductEventRow[];
  const claims = (claimsData ?? []) as ClaimRow[];
  const activeCompanies = companies.filter((row) => !row.deleted_at);
  const companyById = new Map(companies.map((row) => [row.id, row]));

  const failedNotifications24h = notifications.filter((row) => row.status === "failed" && row.created_at >= dayAgo);
  const openContacts = contacts.filter((row) => !["closed", "resolved"].includes(row.status));
  const unhealthyRuns = ingestion.filter((row) => row.status === "failed" || row.errors_count > 0);
  const activeSubscriptions = subscriptions.filter((row) => row.status === "active" || row.status === "trialing");
  const pastDueSubscriptions = subscriptions.filter((row) => row.status === "past_due" || row.status === "unpaid");
  const activeClaims = claims.filter((row) => row.status === "active");

  const funnel = countEvents(events);
  const previewed = funnel.territory_previewed ?? 0;
  const checkoutStarted = funnel.checkout_started ?? 0;
  const checkoutCompleted = funnel.checkout_completed ?? 0;
  const notificationClicks = funnel.notification_cta_clicked ?? 0;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Operations console</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-charcoal">Platform health, customers and conversion.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate">One place to watch acquisition, ingestion, customer coverage, notification delivery and the territory purchase funnel.</p></div>
        <p className="text-xs text-slate">Updated {formatDate(new Date().toISOString())}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <Stat label="Customers" value={activeCompanies.length} note="active companies" />
        <Stat label="Territories" value={activeClaims.length} note="active claims" />
        <Stat label="Applications" value={applications ?? 0} note="ingested" />
        <Stat label="Opportunities" value={opportunities ?? 0} note="active" />
        <Stat label="Lead matches" value={matches ?? 0} note="all time" />
        <Stat label="Open requests" value={openContacts.length} note="needs attention" tone={openContacts.length ? "warning" : "neutral"} />
        <Stat label="Failed emails" value={failedNotifications24h.length} note="last 24h" tone={failedNotifications24h.length ? "warning" : "neutral"} />
        <Stat label="Past due" value={pastDueSubscriptions.length} note="subscriptions" tone={pastDueSubscriptions.length ? "warning" : "neutral"} />
      </div>

      <Section eyebrow="Commercial funnel" title="Explore → checkout → active coverage">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FunnelCard label="Territory previews" value={previewed} detail="Authenticated explorer searches" />
          <FunnelCard label="Checkout started" value={checkoutStarted} detail={conversion(checkoutStarted, previewed) + " of previews"} />
          <FunnelCard label="Checkout completed" value={checkoutCompleted} detail={conversion(checkoutCompleted, checkoutStarted) + " of checkout starts"} />
          <FunnelCard label="Notification CTAs" value={notificationClicks} detail="Clicks from the in-app news rail" />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section eyebrow="Inbox" title="Recent contact requests" compact>
          {contacts.length === 0 ? <Empty text="No contact requests yet." /> : <div className="overflow-hidden rounded-2xl border border-light-grey bg-white"><ul className="divide-y divide-light-grey">{contacts.slice(0, 12).map((row) => <li key={row.id} className="p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold text-charcoal">{row.company_name || row.name}</p><p className="mt-1 break-all text-xs text-slate">{row.email} · {label(row.request_type)}{row.postcode_district ? " · " + row.postcode_district : ""}</p></div><Status value={row.status} /></div><p className="mt-2 text-xs text-slate">Received {formatDate(row.created_at)}</p></li>)}</ul></div>}
        </Section>

        <Section eyebrow="Data pipeline" title="Recent ingestion runs" compact>
          {ingestion.length === 0 ? <Empty text="No ingestion runs recorded yet." /> : <div className="overflow-hidden rounded-2xl border border-light-grey bg-white"><ul className="divide-y divide-light-grey">{ingestion.slice(0, 12).map((row) => <li key={row.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-charcoal">{row.provider} · {label(row.run_type)}</p><p className="mt-1 text-xs text-slate">Fetched {row.applications_fetched} · created {row.applications_created} · updated {row.applications_updated}</p></div><Status value={row.status} /></div><p className={"mt-2 text-xs " + (row.errors_count ? "text-danger" : "text-slate")}>{row.errors_count ? row.errors_count + " errors · " : ""}{formatDate(row.started_at)}</p></li>)}</ul></div>}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section eyebrow="Delivery health" title="Notification failures" compact>
          {failedNotifications24h.length === 0 ? <Empty text="No failed notification deliveries in the last 24 hours." success /> : <div className="rounded-2xl border border-danger/20 bg-danger/[0.03] p-4"><ul className="space-y-3">{failedNotifications24h.slice(0, 10).map((row) => <li key={row.id} className="rounded-xl bg-white p-3"><p className="text-sm font-semibold text-charcoal">{row.subject || label(row.notification_type)}</p><p className="mt-1 text-xs leading-5 text-danger">{row.error_message || "Delivery failed"}</p></li>)}</ul></div>}
        </Section>

        <Section eyebrow="Billing health" title="Subscriptions" compact>
          <div className="grid grid-cols-2 gap-3"><FunnelCard label="Active" value={activeSubscriptions.length} detail="Active or trialing" /><FunnelCard label="Past due" value={pastDueSubscriptions.length} detail="Needs payment attention" /></div>
          {pastDueSubscriptions.length > 0 && <ul className="mt-4 space-y-2">{pastDueSubscriptions.slice(0, 8).map((row) => <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning/[0.04] p-3 text-sm"><span className="truncate font-semibold text-charcoal">{companyById.get(row.company_id)?.trading_name ?? "Unknown company"}</span><Status value={row.status} /></li>)}</ul>}
        </Section>
      </div>

      <Section eyebrow="Customers" title="Customer overview">
        <div className="overflow-x-auto rounded-2xl border border-light-grey bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-soft-surface text-xs uppercase tracking-wide text-slate"><tr><th className="px-4 py-3">Business</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3">Joined</th></tr></thead><tbody>{activeCompanies.map((row) => <tr key={row.id} className="border-t border-light-grey"><td className="px-4 py-4 font-semibold text-charcoal">{row.trading_name}</td><td className="px-4 py-4 text-slate">{row.billing_email}</td><td className="px-4 py-4"><Status value={row.verified ? "verified" : "unverified"} /></td><td className="px-4 py-4 text-slate">{formatDate(row.created_at)}</td></tr>)}</tbody></table></div>
      </Section>

      {unhealthyRuns.length > 0 && <p className="rounded-2xl border border-warning/20 bg-warning/[0.04] p-4 text-sm text-warning">{unhealthyRuns.length} recent ingestion run{unhealthyRuns.length === 1 ? " has" : "s have"} errors or failed status. Review the run details in Supabase before expanding coverage.</p>}
    </div>
  );
}

function countEvents(rows: ProductEventRow[]) { return rows.reduce<Record<string, number>>((out, row) => { out[row.event_name] = (out[row.event_name] ?? 0) + 1; return out; }, {}); }
function conversion(value: number, base: number) { return base > 0 ? Math.round((value / base) * 100) + "%" : "—"; }
function label(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function Section({ eyebrow, title, children, compact = false }: { eyebrow: string; title: string; children: React.ReactNode; compact?: boolean }) { return <section className={compact ? "" : "mt-2"}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate">{eyebrow}</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">{title}</h2><div className="mt-4">{children}</div></section>; }
function Stat({ label, value, note, tone = "neutral" }: { label: string; value: number; note: string; tone?: "neutral" | "warning" }) { return <div className={"rounded-2xl border p-4 " + (tone === "warning" ? "border-warning/20 bg-warning/[0.04]" : "border-light-grey bg-white")}><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">{label}</p><p className="mt-2 text-2xl font-bold text-charcoal">{new Intl.NumberFormat("en-GB").format(value)}</p><p className="mt-1 text-xs text-slate">{note}</p></div>; }
function FunnelCard({ label, value, detail }: { label: string; value: number; detail: string }) { return <div className="rounded-2xl border border-light-grey bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-charcoal">{new Intl.NumberFormat("en-GB").format(value)}</p><p className="mt-1 text-xs text-slate">{detail}</p></div>; }
function Status({ value }: { value: string }) { const good = ["active","trialing","sent","completed","verified","resolved","closed"].includes(value); const bad = ["failed","past_due","unpaid"].includes(value); return <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize " + (good ? "bg-success/10 text-success" : bad ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning")}>{label(value)}</span>; }
function Empty({ text, success = false }: { text: string; success?: boolean }) { return <p className={"rounded-2xl border border-dashed p-5 text-sm " + (success ? "border-success/20 bg-success/[0.03] text-success" : "border-light-grey bg-white text-slate")}>{text}</p>; }
