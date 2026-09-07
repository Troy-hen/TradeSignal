import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { joinTerritoryWaitlist } from "@/lib/actions/territory";
import { ClaimTerritoryButton } from "@/components/claim-territory-button";
import { SubmitButton } from "@/components/submit-button";
import { OpportunityBadge, formatGbp, formatGbpRange } from "@/components/opportunity-badge";

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  available: { label: "Available", className: "text-success" },
  reserved: { label: "Reservation pending payment", className: "text-warning" },
  active: { label: "Claimed exclusively", className: "text-slate" },
  suspended: { label: "Claimed (payment issue)", className: "text-slate" },
};

export default async function TerritoryDetailPage({
  params,
}: {
  params: Promise<{ postcodeDistrict: string; tradeSlug: string }>;
}) {
  const { postcodeDistrict, tradeSlug } = await params;
  const district = decodeURIComponent(postcodeDistrict).trim().toUpperCase();
  const supabase = await createClient();

  const { data: trade } = await supabase
    .from("trade_categories")
    .select("id, name, slug, default_monthly_price_pence")
    .eq("slug", tradeSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!trade) notFound();

  const [{ data: availability }, { data: opportunities }, company] = await Promise.all([
    supabase.rpc("check_territory_availability", {
      p_postcode_district: district,
      p_trade_slug: trade.slug,
    }),
    supabase.rpc("browse_territory_opportunities", {
      p_postcode_district: district,
      p_trade_category_id: trade.id,
      p_limit: 10,
    }),
    getCurrentCompany(),
  ]);

  const stats = Array.isArray(availability) ? availability[0] : availability;
  if (!stats) notFound();

  let isOwnClaim = false;
  if (company && stats.territory_status !== "available") {
    const { data: ownClaim } = await supabase
      .from("territory_claims")
      .select("id, territories!inner(postcode_district, trade_category_id)")
      .eq("company_id", company.id)
      .eq("territories.postcode_district", district)
      .eq("territories.trade_category_id", trade.id)
      .in("status", ["reserved", "active", "suspended"])
      .maybeSingle();
    isOwnClaim = Boolean(ownClaim);
  }

  const status = STATUS_COPY[stats.territory_status] ?? STATUS_COPY.available;
  const priceGbp = Math.round((stats.monthly_price_pence ?? trade.default_monthly_price_pence) / 100);

  return (
    <div className="max-w-3xl">
      <Link href="/territories" className="text-sm text-slate hover:text-charcoal">
        ← Territory Explorer
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">
            {district} · {trade.name}
          </h1>
          <p className={`mt-1 text-sm font-medium ${status.className}`}>{status.label}</p>
        </div>
        <p className="text-2xl font-bold text-charcoal">
          £{priceGbp}
          <span className="text-sm font-normal text-slate">/month</span>
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Opportunities (30d)" value={String(stats.applications_last_30d)} />
        <Kpi label="High priority" value={String(stats.high_priority_count)} />
        <Kpi label="Est. construction activity" value={formatGbp(stats.estimated_construction_activity_gbp)} />
        <Kpi label="Est. trade value" value={formatGbp(stats.estimated_trade_value_gbp)} />
      </dl>

      <div className="mt-8">
        {isOwnClaim ? (
          <div className="rounded-md border border-light-grey bg-white p-4">
            <p className="text-sm font-medium text-charcoal">You hold this territory.</p>
            <Link href="/dashboard" className="text-sm font-medium text-signal-orange hover:underline">
              Go to your dashboard →
            </Link>
          </div>
        ) : stats.territory_status === "available" ? (
          <ClaimTerritoryButton postcodeDistrict={district} tradeCategoryId={trade.id} priceGbp={priceGbp} />
        ) : (
          <div className="rounded-md border border-light-grey bg-white p-4">
            <p className="text-sm font-medium text-charcoal">This territory is already claimed exclusively.</p>
            <p className="mt-1 text-sm text-slate">
              We&apos;ll email you the moment {district} {trade.name} becomes available again.
            </p>
            <form action={joinTerritoryWaitlist.bind(null, district, trade.id, trade.slug)} className="mt-3">
              <SubmitButton
                pendingText="Joining…"
                className="rounded-md border border-signal-orange px-4 py-2 text-sm font-semibold text-signal-orange transition hover:bg-signal-orange hover:text-white disabled:opacity-60"
              >
                Notify Me If Available
              </SubmitButton>
            </form>
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-charcoal">Recent opportunities</h2>
        <p className="mb-4 text-sm text-slate">
          A preview of what the {district} {trade.name} territory holder sees. Claim the territory to unlock
          full addresses, AI scope analysis, and contact-timing recommendations.
        </p>
        {!opportunities || opportunities.length === 0 ? (
          <p className="rounded-md border border-dashed border-light-grey p-6 text-center text-sm text-slate">
            No active opportunities detected here yet — new planning applications are checked continuously.
          </p>
        ) : (
          <ul className="space-y-3">
            {opportunities.map((opp) => (
              <li key={opp.id} className="rounded-md border border-light-grey bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <OpportunityBadge bucket={opp.opportunity_bucket} score={opp.opportunity_score} />
                    <span className="font-medium text-charcoal">{opp.project_type ?? "Planning application"}</span>
                  </div>
                  <span className="text-sm text-slate">
                    {opp.received_date ? new Date(opp.received_date).toLocaleDateString("en-GB") : "—"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate">
                  <span>
                    Est. project value:{" "}
                    {formatGbpRange(opp.estimated_total_project_value_low, opp.estimated_total_project_value_high)}
                  </span>
                  <span>
                    Est. trade value:{" "}
                    {formatGbpRange(opp.estimated_trade_value_low, opp.estimated_trade_value_high)}
                  </span>
                </div>
                <div className="locked-panel mt-3 rounded-md bg-soft-surface p-3">
                  <span className="relative z-10 text-xs font-medium text-white">
                    Address, AI scope analysis &amp; contact timing — unlock with the territory
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
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
