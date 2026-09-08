import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { OpportunityRow } from "@/components/opportunity-row";
import type { Database } from "@/lib/types/database";

type OpportunityBucket = Database["public"]["Enums"]["opportunity_bucket"];

const BUCKETS: { value: OpportunityBucket | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "hot", label: "Hot" },
  { value: "strong", label: "Strong" },
  { value: "possible", label: "Possible" },
  { value: "low", label: "Low" },
];
const VALID_BUCKETS = new Set<string>(["hot", "strong", "possible", "low"]);

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  const company = await requireCurrentCompany();
  const { bucket } = await searchParams;
  const validBucket = bucket && VALID_BUCKETS.has(bucket) ? (bucket as OpportunityBucket) : undefined;
  const supabase = await createClient();

  const [{ data: activeClaims }, opportunities] = await Promise.all([
    supabase.from("territory_claims").select("id").eq("company_id", company.id).eq("status", "active").limit(1),
    getCompanyOpportunities(company.id, { bucket: validBucket, limit: 200 }),
  ]);

  const hasActiveClaims = (activeClaims?.length ?? 0) > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal">Opportunities</h1>
      <p className="mt-2 text-slate">Every opportunity currently matched to your claimed territories, newest first.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <Link
            key={b.value}
            href={b.value ? `/opportunities?bucket=${b.value}` : "/opportunities"}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              (bucket ?? "") === b.value
                ? "border-signal-orange bg-signal-orange text-white"
                : "border-light-grey text-charcoal hover:border-signal-orange"
            }`}
          >
            {b.label}
          </Link>
        ))}
      </div>

      {opportunities.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-light-grey p-8 text-center">
          {hasActiveClaims ? (
            <p className="text-sm text-slate">No opportunities match this filter yet.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-charcoal">You haven&apos;t claimed a territory yet.</p>
              <Link href="/territories" className="mt-2 inline-block text-sm font-medium text-signal-orange hover:underline">
                Browse the Territory Explorer →
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
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
