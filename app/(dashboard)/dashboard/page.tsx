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

  const recent = opportunities.slice(0, 8);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal">Welcome back, {company.trading_name}</h1>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="New opportunities" value={String(newCount)} />
        <Kpi label="High priority" value={String(hotCount)} />
        <Kpi label="Approved this week" value={String(approvedThisWeek)} />
        <Kpi label="Est. pipeline value" value={formatGbp(pipelineValue)} />
      </dl>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-charcoal">Recent opportunities</h2>
        <Link href="/opportunities" className="text-sm font-medium text-signal-orange hover:underline">
          View all →
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-light-grey p-6 text-center text-sm text-slate">
          No opportunities yet — new planning applications in your territories are checked continuously.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {recent.map((item) => (
            <li key={item.leadMatchId}>
              <OpportunityRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-light-grey bg-white p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

function FreeState({ companyName }: { companyName: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal">Welcome, {companyName}</h1>
      <div className="mt-6 rounded-lg border border-light-grey bg-white p-8 text-center">
        <p className="text-lg font-semibold text-charcoal">You haven&apos;t claimed a territory yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate">
          Claim an exclusive postcode district + trade combination to start receiving planning opportunities in
          your area — full addresses, AI scope analysis, contact timing, and alerts the moment something new is
          detected.
        </p>
        <Link
          href="/territories"
          className="mt-6 inline-block rounded-md bg-signal-orange px-6 py-2.5 font-semibold text-white transition hover:brightness-95"
        >
          Browse the Territory Explorer
        </Link>
      </div>
    </div>
  );
}
