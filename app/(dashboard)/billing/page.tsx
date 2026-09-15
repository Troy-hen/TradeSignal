import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { AppPageHeader } from "@/components/app-page-header";
import { AppSectionHeader } from "@/components/app-section-header";
import { COVERAGE_PLANS, formatMonthlyGbp, getCoveragePlan, type CoveragePlanId } from "@/lib/coverage/pricing";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
};
const PLAN_IDS: CoveragePlanId[] = ["local", "regional", "nationwide"];
const MODE_LABELS: Record<string, string> = {
  county: "County coverage",
  places: "Selected towns or cities",
  radius: "Radius coverage",
  nationwide: "United Kingdom",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; mode?: string }>;
}) {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const { plan: planParam, mode: modeParam } = await searchParams;
  const requestedPlanId = PLAN_IDS.includes(planParam as CoveragePlanId) ? planParam as CoveragePlanId : null;
  const requestedPlan = requestedPlanId ? getCoveragePlan(requestedPlanId) : null;

  const [{ data: subscriptions }, { data: coveragePlans }, { data: companyBilling }] = await Promise.all([
    supabase.from("subscriptions").select("id, status, current_period_end, cancel_at_period_end").eq("company_id", company.id).order("created_at", { ascending: false }),
    supabase.from("coverage_plans").select("id, status, coverage_tier, monthly_price_pence, stripe_customer_id, stripe_subscription_id").eq("company_id", company.id).in("status", ["reserved", "active", "pending_change", "suspended"]).order("created_at", { ascending: false }),
    supabase.from("companies").select("stripe_customer_id").eq("id", company.id).maybeSingle(),
  ]);

  const currentCoverage = coveragePlans?.[0] ?? null;
  const currentTier = currentCoverage?.coverage_tier && PLAN_IDS.includes(currentCoverage.coverage_tier as CoveragePlanId)
    ? currentCoverage.coverage_tier as CoveragePlanId
    : null;
  const currentPlan = currentTier ? getCoveragePlan(currentTier) : null;
  const looseDb = createAdminClient() as unknown as LooseDb;
  const [{ data: companyTrialRow }, { data: planTrialRow }] = await Promise.all([
    looseDb.from("companies").select("trial_started_at, trial_ends_at, trial_lead_unlock_limit, trial_lead_unlocks_used").eq("id", company.id).maybeSingle(),
    currentCoverage
      ? looseDb.from("coverage_plans").select("trial_started_at, trial_lead_unlock_limit, trial_lead_unlocks_used").eq("id", currentCoverage.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const companyTrial = companyTrialRow as CompanyTrial | null;
  const planTrial = planTrialRow as PlanTrial | null;
  const trialStartedAt = companyTrial?.trial_started_at ?? planTrial?.trial_started_at ?? null;
  const trialEndsAt = companyTrial?.trial_ends_at ?? (trialStartedAt ? new Date(new Date(trialStartedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() : null);
  const trialInfo = { trial_started_at: trialStartedAt, trial_ends_at: trialEndsAt, trial_lead_unlock_limit: companyTrial?.trial_lead_unlock_limit ?? planTrial?.trial_lead_unlock_limit ?? 3, trial_lead_unlocks_used: companyTrial?.trial_lead_unlocks_used ?? planTrial?.trial_lead_unlocks_used ?? 0 };
  // Server-rendered billing state is intentionally time-aware; the lint rule
  // for client render purity does not apply to this server component.
  // eslint-disable-next-line react-hooks/purity
  const trialActive = Boolean(trialInfo.trial_ends_at && new Date(trialInfo.trial_ends_at).getTime() > Date.now());
  const trialRemaining = Math.max(0, Number(trialInfo.trial_lead_unlock_limit) - Number(trialInfo.trial_lead_unlocks_used));
  const hasSubscriptions = Boolean(subscriptions?.length);
  const hasBillingAccount = Boolean(companyBilling?.stripe_customer_id || currentCoverage?.stripe_customer_id);
  const requestedIsCurrent = Boolean(requestedPlanId && currentTier === requestedPlanId);
  const requestedMode = MODE_LABELS[modeParam ?? ""] ?? "Geographic reach";

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow="Account"
        title="Billing."
        description="Review your current Marketplace plan here. Stripe handles payment methods, invoices and the final confirmation of paid subscription changes."
        actions={<Link href="/coverage#coverage-shape" className="inline-flex items-center justify-center rounded-xl border border-light-grey px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-charcoal/25 hover:bg-soft-surface">Plan & profile <span className="ml-2">→</span></Link>}
        stats={[
          { label: "Current plan", value: currentPlan?.name ?? "Not active", detail: trialActive ? `Trial · ${trialRemaining} lead credit${trialRemaining === 1 ? "" : "s"} left` : currentCoverage ? humanize(currentCoverage.status) : "Choose a geographic reach" },
          { label: "Platform fee", value: currentCoverage ? formatMonthlyGbp(Number(currentCoverage.monthly_price_pence)) : "From £29.99", detail: "Monthly geographic access" },
          { label: "Lead unlock", value: "£20 each", detail: "Only when you choose" },
        ]}
      />

      {trialActive && <section className="rounded-3xl border border-signal-orange/25 bg-signal-orange/[0.045] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Everro trial</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Try the intelligence before the monthly fee begins.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate">Your first coverage selection includes 14 days with no monthly coverage charge and {trialInfo.trial_lead_unlock_limit} lead unlock credits. Additional unlocks are £20 each; coverage billing starts when the trial ends.</p><p className="mt-2 text-xs font-semibold text-slate">Trial ends {new Date(trialInfo.trial_ends_at!).toLocaleDateString("en-GB")}.</p></div><div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-center shadow-sm"><p className="text-2xl font-bold text-charcoal">{trialRemaining}</p><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate">Credits left</p></div></div></section>}

      {requestedPlan && (
        <section className="rounded-3xl border border-signal-orange/25 bg-signal-orange/[0.045] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Plan review</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">
                {requestedIsCurrent ? requestedPlan.name + " is already your current plan." : "Review " + requestedPlan.name + " before continuing."}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
                {requestedPlan.description} Selected area shape: {requestedMode}. Nothing changes until the paid subscription change is confirmed.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {currentPlan && <span className="rounded-full border border-light-grey bg-white px-3 py-1.5 text-xs font-semibold text-slate">Current · {currentPlan.name}</span>}
                <span className="rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold text-white">Selected · {requestedPlan.name} · {formatMonthlyGbp(requestedPlan.monthlyPricePence)}/month</span>
              </div>
            </div>
            <div className="shrink-0">
              {requestedIsCurrent
                ? <Link href="/coverage#coverage-shape" className="inline-flex rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal">Back to plan</Link>
                : hasBillingAccount
                  ? <BillingPortalButton label="Continue to billing portal" />
                  : <div className="max-w-sm rounded-2xl border border-light-grey bg-white p-4"><p className="text-sm font-semibold text-charcoal">Billing account not connected</p><p className="mt-1 text-xs leading-5 text-slate">{currentCoverage ? "This workspace has coverage access without a Stripe subscription. No charge or plan change will be created." : "Choose your profile and reach first; paid activation will create the billing account."}</p></div>}
            </div>
          </div>
        </section>
      )}

      <section>
        <AppSectionHeader eyebrow="Plan pricing" title="Geography sets the platform fee." description="Every intelligence source and B2B category is included. Individual lead unlocks remain £20." />
        <div className="grid gap-4 md:grid-cols-3">
          {COVERAGE_PLANS.map((plan) => (
            <BillingCard
              key={plan.id}
              label={plan.name + (currentTier === plan.id ? " · Current" : "")}
              value={formatMonthlyGbp(plan.monthlyPricePence)}
              detail={plan.description}
              active={currentTier === plan.id}
            />
          ))}
        </div>
      </section>

      {hasBillingAccount ? (
        <section className="rounded-3xl bg-charcoal p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Stripe billing</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">Payment details and invoices.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Open the secure portal to update your payment method, download invoices or manage the paid subscription. Lead unlocks are recorded separately.</p>
            </div>
            <BillingPortalButton />
          </div>
        </section>
      ) : currentCoverage ? (
        <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Workspace entitlement</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">{currentPlan?.name ?? "Marketplace"} access is active without Stripe billing.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">This is typically a demo or manually provisioned workspace. Billing controls stay hidden because there is no customer account, subscription or invoice to manage.</p>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-signal-orange/30 bg-signal-orange/[0.04] p-7 text-center sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">No platform plan yet</p>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-charcoal">Set your profile and choose your geographic reach.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate">Plan & Profile is where you select Local, Regional or Nationwide. Billing is the review and payment step.</p>
          <Link href="/coverage#profile" className="mt-5 inline-flex rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white">Choose plan & profile →</Link>
        </section>
      )}

      {hasSubscriptions && (
        <section>
          <AppSectionHeader eyebrow="Billing history" title="Subscriptions." meta={<span className="rounded-full bg-soft-surface px-3 py-1.5 text-xs font-semibold text-slate">{subscriptions!.length} total</span>} />
          <ul className="space-y-3">
            {subscriptions!.map((sub) => (
              <li key={sub.id} className="rounded-2xl border border-light-grey bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><span className={"h-2 w-2 rounded-full " + (sub.status === "active" || sub.status === "trialing" ? "bg-success" : "bg-warning")} /><span className="font-semibold text-charcoal">{STATUS_LABELS[sub.status] ?? sub.status}</span></div>
                  {sub.cancel_at_period_end && <span className="rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">Cancels at period end</span>}
                </div>
                {sub.current_period_end && <p className="mt-2 text-sm text-slate">Renews {new Date(sub.current_period_end).toLocaleDateString("en-GB")}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BillingCard({ label, value, detail, active }: { label: string; value: string; detail: string; active: boolean }) {
  return <div className={"rounded-2xl border bg-white p-5 " + (active ? "border-signal-orange shadow-sm" : "border-light-grey")}><p className={"text-xs font-semibold uppercase tracking-[0.1em] " + (active ? "text-signal-orange" : "text-slate")}>{label}</p><p className="mt-3 text-xl font-bold tracking-tight text-charcoal">{value}<span className="ml-1 text-xs font-normal text-slate">/month</span></p><p className="mt-1 text-xs leading-5 text-slate">{detail}</p></div>;
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type CompanyTrial = { trial_started_at?: string | null; trial_ends_at?: string | null; trial_lead_unlock_limit?: number; trial_lead_unlocks_used?: number };
type PlanTrial = { trial_started_at?: string | null; trial_lead_unlock_limit?: number; trial_lead_unlocks_used?: number };
type LooseDb = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
      };
    };
  };
};
