import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { formatGbp } from "@/components/opportunity-badge";
import { OpportunityRow } from "@/components/opportunity-row";

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const { data: activeClaims } = await supabase
    .from("territory_claims")
    .select("id")
    .eq("company_id", company.id)
    .eq("status", "active")
    .limit(1);

  if (!activeClaims || activeClaims.length === 0) {
    return <FreeState companyName={company.trading_name} />;
  }

  const opportunities = await getCompanyOpportunities(company.id);
  const newCount = opportunities.filter((o) => o.currentAction === null).length;
  const hotCount = opportunities.filter((o) => o.bucket === "hot").length;
  const sevenDaysAgo = dateDaysAgo(7);
  const approvedThisWeek = opportunities.filter(
    (o) => o.planningStatus === "approved" && o.decisionDate !== null && o.decisionDate >= sevenDaysAgo,
  ).length;
  const pipelineValue = opportunities
    .filter((o) => o.currentAction !== "won" && o.currentAction !== "lost")
    .reduce((sum, o) => sum + (o.valueHigh ?? 0), 0);
  const recent = opportunities.slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Overview</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
            Good to see you, {company.trading_name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
            Here is the latest signal from the territories you own. Start with the highest-scoring opportunities,
            then move through the rest when you have time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/territories"
            className="inline-flex items-center justify-center rounded-xl border border-signal-orange/20 bg-signal-orange/[0.05] px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/50 hover:bg-signal-orange/[0.08]"
          >
            Find a territory
          </Link>
          <Link
            href="/opportunities"
            className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
          >
            View opportunities <span className="ml-2">→</span>
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="New opportunities" value={String(newCount)} detail="Ready for your first look" tone="orange" />
        <Kpi label="High priority" value={String(hotCount)} detail="Score 90 or above" tone="green" />
        <Kpi label="Approved this week" value={String(approvedThisWeek)} detail="Recent planning decisions" tone="blue" />
        <Kpi label="Est. pipeline value" value={formatGbp(pipelineValue)} detail="Open opportunities only" tone="charcoal" />
      </dl>

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-light-grey bg-white">
          <div className="flex flex-col gap-3 border-b border-signal-orange/10 bg-signal-orange/[0.025] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Your opportunity feed</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-charcoal">Recent opportunities</h2>
            </div>
            <Link href="/opportunities" className="text-sm font-semibold text-signal-orange hover:text-[#e95f00]">
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="m-5 rounded-2xl border border-dashed border-light-grey bg-soft-surface p-8 text-center text-sm text-slate sm:m-6">
              No opportunities yet — new planning applications in your territories are checked continuously.
            </p>
          ) : (
            <ul className="space-y-3 p-4 sm:p-5">
              {recent.map((item) => (
                <li key={item.leadMatchId} className="min-w-0">
                  <OpportunityRow item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="min-w-0 rounded-3xl bg-charcoal p-6 text-white shadow-xl shadow-charcoal/10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Next best move</p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">Work the signal, not the spreadsheet.</h2>
          <p className="mt-4 text-sm leading-6 text-white/65">
            Open a high-scoring opportunity, review the recommended timing and record what happens next. Your feed
            gets more useful as you move opportunities through the pipeline.
          </p>
          <div className="mt-7 space-y-3 border-t border-white/10 pt-5 text-sm">
            <QuickTip label="Start with" value="Hot opportunities" />
            <QuickTip label="Then check" value="Recommended action" />
            <QuickTip label="Keep updated" value="Contact and outcome" />
          </div>
          <Link href="/opportunities?bucket=hot" className="mt-7 inline-flex items-center text-sm font-semibold text-signal-orange hover:text-white">
            Show high-priority work <span className="ml-2">→</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "orange" | "green" | "blue" | "charcoal";
}) {
  const toneClass = {
    orange: "border-signal-orange/25 bg-signal-orange/[0.06]",
    green: "border-success/15 bg-success/[0.035]",
    blue: "border-slate/15 bg-slate/[0.035]",
    charcoal: "border-charcoal/10 bg-charcoal/[0.025]",
  }[tone];
  const dotClass = {
    orange: "bg-signal-orange",
    green: "bg-success",
    blue: "bg-slate",
    charcoal: "bg-charcoal",
  }[tone];

  return (
    <div className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${toneClass}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        <dt className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate sm:text-xs sm:tracking-[0.11em]">{label}</dt>
      </div>
      <dd className="mt-4 break-words text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">{value}</dd>
      <p className="mt-1 text-xs text-slate">{detail}</p>
    </div>
  );
}

function QuickTip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="text-white/50">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function FreeState({ companyName }: { companyName: string }) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Welcome to MyTradeBox</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Your local pipeline starts here.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
          {companyName}, choose a territory and trade to start seeing the planning opportunities worth your time.
        </p>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <section className="min-w-0 rounded-3xl bg-charcoal p-7 text-white sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Start with one patch</p>
          <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight">Own the signal in the areas you already know.</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
            Claim an exclusive postcode district and trade combination to unlock matched planning applications,
            estimated trade value, contact timing and practical next actions.
          </p>
          <Link
            href="/territories"
            className="mt-7 inline-flex items-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
          >
            Browse territories <span className="ml-2">→</span>
          </Link>
        </section>

        <div className="min-w-0 rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">What happens next</p>
          <div className="mt-6 space-y-5">
            <OnboardingStep number="01" title="Choose your area" body="Search a postcode district and trade." />
            <OnboardingStep number="02" title="Check the signal" body="See activity, value and availability." />
            <OnboardingStep number="03" title="Make the move" body="Claim the patch and work the feed." />
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-signal-orange shadow-sm">
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-charcoal">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate">{body}</p>
      </div>
    </div>
  );
}
