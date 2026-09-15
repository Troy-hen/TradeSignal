import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CompanyRow = { id: string; trading_name: string; created_at: string; deleted_at: string | null };
type SubscriptionRow = { company_id: string; status: string };
type PlanRow = { company_id: string; status: string; monthly_price_pence: number | null };
type EventRow = { event_name: string; created_at: string };

export default async function AdminOverviewPage() {
  const db = createAdminClient() as unknown as SupabaseClient;
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: companiesData }, { data: subscriptionsData }, { data: plansData }, { data: eventsData }, { count: applications }, { count: opportunities }, { count: matches }] = await Promise.all([
    db.from("companies").select("id, trading_name, created_at, deleted_at").order("created_at", { ascending: false }).limit(500),
    db.from("subscriptions").select("company_id, status").limit(500),
    db.from("coverage_plans").select("company_id, status, monthly_price_pence").limit(500),
    db.from("product_events").select("event_name, created_at").gte("created_at", monthAgo).limit(10000),
    db.from("planning_applications").select("id", { count: "exact", head: true }),
    db.from("application_trade_opportunities").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.from("lead_matches").select("id", { count: "exact", head: true }),
  ]);

  const companies = (companiesData ?? []) as CompanyRow[];
  const subscriptions = (subscriptionsData ?? []) as SubscriptionRow[];
  const plans = (plansData ?? []) as PlanRow[];
  const events = (eventsData ?? []) as EventRow[];
  const activeCompanies = companies.filter((company) => !company.deleted_at);
  const activeSubscriptions = subscriptions.filter((row) => ["active", "trialing"].includes(row.status));
  const payingCompanyIds = new Set(activeSubscriptions.map((row) => row.company_id));
  const mrrPence = plans.filter((row) => ["active", "trialing"].includes(row.status)).reduce((sum, row) => sum + Number(row.monthly_price_pence ?? 0), 0);
  const unlockCount = events.filter((event) => ["lead_unlocked", "opportunity_unlocked"].includes(event.event_name)).length;
  const signups = events.filter((event) => ["signup_completed", "account_created"].includes(event.event_name)).length;
  const newCustomers = activeCompanies.filter((company) => company.created_at >= monthAgo).length;
  const recentEvents = events.filter((event) => event.created_at >= dayAgo).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Internal operating system</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-charcoal">Platform performance and growth.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate">Monitor the customer product, opportunity inventory and the internal engine that turns relevant inventory into new customers.</p></div><p className="text-xs text-slate">Updated {formatDate(now.toISOString())}</p></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8"><Metric label="MRR" value={formatGbp(mrrPence)} note="platform subscriptions" /><Metric label="ARR" value={formatGbp(mrrPence * 12)} note="annualised" /><Metric label="Unlock revenue" value={formatGbp(unlockCount * 2000)} note={`${unlockCount} tracked unlocks`} /><Metric label="Customers" value={payingCompanyIds.size} note="active accounts" /><Metric label="New customers" value={newCustomers} note="last 30 days" /><Metric label="Opportunities" value={opportunities ?? 0} note="active inventory" /><Metric label="Applications" value={applications ?? 0} note="source records" /><Metric label="Events" value={recentEvents} note="last 24 hours" /></div>

      <section className="rounded-3xl bg-charcoal p-6 text-white shadow-xl shadow-charcoal/10 sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Growth Engine</p><h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Use the platform&apos;s own intelligence to sell the platform.</h2><p className="mt-3 text-sm leading-6 text-white/65">Find businesses whose services match live opportunities, build a grounded Supplier Profile, show them real teaser inventory and attribute every signup and £20 unlock back to the campaign.</p></div><Link href="/admin/growth" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Open Growth Engine →</Link></div><div className="mt-7 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3"><GrowthStat label="Qualified prospects" value="0" detail="Prospect index not connected" /><GrowthStat label="Ready to contact" value="0" detail="Human review required" /><GrowthStat label="Acquisition revenue" value="£0.00" detail="Attribution ledger pending" /></div></section>

      <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity supply</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Inventory ready to match</h2></div><Link href="/admin/opportunities" className="text-sm font-semibold text-signal-orange">Inspect →</Link></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniMetric label="Active opportunities" value={opportunities ?? 0} /><MiniMetric label="Lead matches" value={matches ?? 0} /><MiniMetric label="Tracked product events" value={events.length} /></div><p className="mt-5 rounded-2xl bg-soft-surface p-4 text-sm leading-6 text-slate">The next internal step is to resolve these canonical opportunities against Supplier Profiles rather than duplicating lead records for marketing.</p></section><section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Customer funnel</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Signup to paid behaviour</h2></div><Link href="/admin/conversions" className="text-sm font-semibold text-signal-orange">View attribution →</Link></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniMetric label="Signups" value={signups} /><MiniMetric label="Paid accounts" value={payingCompanyIds.size} /><MiniMetric label="First unlocks" value={unlockCount} /></div><p className="mt-5 rounded-2xl bg-soft-surface p-4 text-sm leading-6 text-slate">Campaign and prospect attribution will be read from the same event stream once the internal growth schema is connected.</p></section></div>

      <section className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Operating rule</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">No automatic outreach without evidence and suppression checks.</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><Rule title="Match first" body="A prospect needs a real Supplier Profile and meaningful current opportunity inventory." /><Rule title="Review before send" body="The first release creates a Ready to Send queue for human approval." /><Rule title="Attribute everything" body="Campaign, teaser, click, signup, plan and unlock revenue remain connected." /></div></section>
    </div>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatGbp(pence: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pence / 100); }
function Metric({ label, value, note }: { label: string; value: string | number; note: string }) { return <div className="rounded-2xl border border-light-grey bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-charcoal">{typeof value === "number" ? new Intl.NumberFormat("en-GB").format(value) : value}</p><p className="mt-1 text-xs text-slate">{note}</p></div>; }
function GrowthStat({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p><p className="mt-1 text-xs text-white/55">{detail}</p></div>; }
function MiniMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-light-grey bg-soft-surface p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-2 text-2xl font-bold text-charcoal">{new Intl.NumberFormat("en-GB").format(value)}</p></div>; }
function Rule({ title, body }: { title: string; body: string }) { return <div className="rounded-2xl border border-light-grey bg-white p-4"><p className="text-sm font-semibold text-charcoal">{title}</p><p className="mt-1 text-xs leading-5 text-slate">{body}</p></div>; }
