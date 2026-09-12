import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { AppPageHeader } from "@/components/app-page-header";

const STATUS_LABELS: Record<string, string> = { trialing: "Trialing", active: "Active", past_due: "Payment past due", canceled: "Cancelled", unpaid: "Unpaid", incomplete: "Incomplete", incomplete_expired: "Expired" };

export default async function BillingPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const { data: subscriptions } = await supabase.from("subscriptions").select("id, status, current_period_end, cancel_at_period_end").eq("company_id", company.id).order("created_at", { ascending: false });
  const hasSubscriptions = Boolean(subscriptions?.length);

  return (
    <div className="space-y-8">
      <AppPageHeader eyebrow="Account" title="Billing." description="Manage your TradeSignal platform subscription, individual opportunity unlocks, payment details and invoices." actions={<Link href="/coverage" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Manage coverage <span className="ml-2">→</span></Link>} stats={[{ label: "Platform access", value: "Geography", detail: "Local, Regional or Nationwide" }, { label: "Lead unlock", value: "£20 each", detail: "Only when you choose" }]} />
      <section className="grid gap-4 sm:grid-cols-2"><BillingCard label="Platform fee" value="Local · £29.99" detail="Regional £59.99 · Nationwide £99.99" /><BillingCard label="Opportunity unlock" value="£20 each" detail="Only when you choose to unlock a lead" /></section>
      {hasSubscriptions && <section className="rounded-3xl bg-charcoal p-6 text-white sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Manage subscription</p><h2 className="mt-3 text-2xl font-bold tracking-tight">Keep your coverage and profile working.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Update your payment method, view invoices or manage the platform subscription in the secure Stripe portal. Lead unlocks are recorded separately.</p></div><BillingPortalButton /></div></section>}
      {hasSubscriptions ? <section><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Subscription history</p><ul className="mt-4 space-y-3">{subscriptions!.map((sub) => <li key={sub.id} className="rounded-2xl border border-light-grey bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${sub.status === "active" || sub.status === "trialing" ? "bg-success" : "bg-warning"}`} /><span className="font-semibold text-charcoal">{STATUS_LABELS[sub.status] ?? sub.status}</span></div>{sub.cancel_at_period_end && <span className="rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">Cancels at period end</span>}</div>{sub.current_period_end && <p className="mt-2 text-sm text-slate">Renews {new Date(sub.current_period_end).toLocaleDateString("en-GB")}</p>}</li>)}</ul></section> : <section className="rounded-3xl border border-dashed border-signal-orange/30 bg-signal-orange/[0.04] p-7 text-center sm:p-10"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">No platform subscription yet</p><h2 className="mt-3 text-xl font-bold tracking-tight text-charcoal">Choose the geography you need.</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate">Set up your business profile, select Local, Regional or Nationwide coverage, then unlock individual opportunities at £20 each.</p><Link href="/coverage" className="mt-5 inline-flex rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white">Set up coverage →</Link></section>}
    </div>
  );
}

function BillingCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-light-grey bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-3 text-xl font-bold tracking-tight text-charcoal">{value}</p><p className="mt-1 text-xs leading-5 text-slate">{detail}</p></div>; }
