import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { OpportunityRow } from "@/components/opportunity-row";
import type { Database } from "@/lib/types/database";
import type { OpportunityActionFilter } from "@/lib/data/opportunities";

type OpportunityBucket = Database["public"]["Enums"]["opportunity_bucket"];

const BUCKETS: { value: OpportunityBucket | ""; label: string; helper: string }[] = [
  { value: "", label: "All", helper: "Everything matched" },
  { value: "hot", label: "Hot", helper: "90+ score" },
  { value: "strong", label: "Strong", helper: "75–89 score" },
  { value: "possible", label: "Possible", helper: "50–74 score" },
  { value: "low", label: "Low", helper: "Below 50" },
];
const VALID_BUCKETS = new Set<string>(["hot", "strong", "possible", "low"]);
const ACTIONS: { value: OpportunityActionFilter | ""; label: string }[] = [
  { value: "", label: "All stages" },
  { value: "new", label: "New" },
  { value: "saved", label: "Saved" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];
const VALID_ACTIONS = new Set<string>(["new", "saved", "contacted", "quoted", "won", "lost"]);

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  const company = await requireCurrentCompany();
  const { bucket, action } = await searchParams;
  const validBucket = bucket && VALID_BUCKETS.has(bucket) ? (bucket as OpportunityBucket) : undefined;
  const validAction = action && VALID_ACTIONS.has(action) ? (action as OpportunityActionFilter) : undefined;
  const supabase = await createClient();

  const [{ data: activeClaims }, opportunities] = await Promise.all([
    supabase.from("territory_claims").select("id").eq("company_id", company.id).eq("status", "active").limit(1),
    getCompanyOpportunities(company.id, { bucket: validBucket, action: validAction, limit: 300 }),
  ]);

  const hasActiveClaims = (activeClaims?.length ?? 0) > 0;
  const selectedBucket = bucket && VALID_BUCKETS.has(bucket) ? bucket : "";
  const selectedAction = action && VALID_ACTIONS.has(action) ? action : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Opportunity feed</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Work worth chasing.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
            Every planning opportunity matched to the territories your business owns, ranked by the signal that matters.
          </p>
        </div>
        <Link
          href="/territories"
          className="inline-flex items-center justify-center self-start rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 sm:self-auto"
        >
          Explore territories <span className="ml-2">→</span>
        </Link>
      </div>

      <section className="rounded-3xl border border-light-grey bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-charcoal">Filter by opportunity score</p>
            <p className="mt-1 text-xs text-slate">Start with Hot when you want the highest-intent work first, then use the pipeline stage to focus on the next action.</p>
          </div>
          <p className="text-xs font-medium text-slate">{opportunities.length} {opportunities.length === 1 ? "opportunity" : "opportunities"}</p>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {BUCKETS.map((item) => {
            const params = new URLSearchParams();
            if (item.value) params.set("bucket", item.value);
            if (selectedAction) params.set("action", selectedAction);
            const href = params.toString() ? "/opportunities?" + params.toString() : "/opportunities";
            return (
              <Link
                key={item.value}
                href={href}
                className={`flex min-w-max items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  selectedBucket === item.value
                    ? "border-signal-orange bg-signal-orange text-white"
                    : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"
                }`}
              >
                <span>{item.label}</span>
                <span className={selectedBucket === item.value ? "text-white/70" : "text-slate"}>{item.helper}</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-light-grey pt-4">
          {ACTIONS.map((item) => {
            const params = new URLSearchParams();
            if (selectedBucket) params.set("bucket", selectedBucket);
            if (item.value) params.set("action", item.value);
            const href = params.toString() ? "/opportunities?" + params.toString() : "/opportunities";
            return (
              <Link
                key={item.value}
                href={href}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  selectedAction === item.value
                    ? "border-charcoal bg-charcoal text-white"
                    : "border-light-grey bg-white text-charcoal hover:border-signal-orange/40"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>

      {opportunities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-light-grey bg-white p-10 text-center sm:p-14">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-orange/10 text-xl text-signal-orange">✦</div>
          {hasActiveClaims ? (
            <>
              <h2 className="mt-5 text-lg font-semibold text-charcoal">Nothing matches this filter yet.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">
                Try another score band or check back after the next planning activity refresh.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-5 text-lg font-semibold text-charcoal">Claim a territory to unlock your feed.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">
                Choose a postcode district and trade to start seeing matched local projects here.
              </p>
              <Link href="/territories" className="mt-5 inline-flex text-sm font-semibold text-signal-orange hover:text-[#e95f00]">
                Browse the Territory Explorer →
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {opportunities.map((item) => (
            <li key={item.leadMatchId}>
              <OpportunityRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
