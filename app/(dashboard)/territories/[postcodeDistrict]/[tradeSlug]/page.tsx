import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { joinTerritoryWaitlist } from "@/lib/actions/territory";
import { ClaimTerritoryButton } from "@/components/claim-territory-button";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";
import { SubmitButton } from "@/components/submit-button";
import { formatGbp } from "@/components/opportunity-badge";

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

  const [{ data: availability }, company] = await Promise.all([
    supabase.rpc("check_territory_availability", {
      p_postcode_district: district,
      p_trade_slug: trade.slug,
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
    <div className="max-w-5xl space-y-8">
      <Link href="/territories" className="inline-flex items-center gap-2 text-sm font-semibold text-slate transition hover:text-charcoal">
        ← Territory Explorer
      </Link>

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Exclusive territory</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              {district} · {trade.name}
            </h1>
            <p className={\`mt-3 inline-flex items-center gap-2 text-sm font-semibold \${status.className}\`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {status.label}
            </p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-charcoal">
            £{priceGbp}
            <span className="text-sm font-normal text-slate">/month</span>
          </p>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Matched opportunities (30d)" value={String(stats.applications_last_30d)} />
        <Kpi label="High priority" value={String(stats.high_priority_count)} />
        <Kpi label="Est. construction activity" value={formatGbp(stats.estimated_construction_activity_gbp)} />
        <Kpi label="Est. trade value" value={formatGbp(stats.estimated_trade_value_gbp)} />
      </dl>

      <section>
        {isOwnClaim ? (
          <div className="rounded-3xl border border-success/20 bg-success/5 p-6">
            <p className="text-sm font-semibold text-charcoal">You hold this territory.</p>
            <p className="mt-1 text-sm text-slate">The full opportunity feed, AI interpretation and contact tools are available from your dashboard.</p>
            <Link href="/dashboard" className="mt-4 inline-flex text-sm font-semibold text-success hover:underline">
              Open your opportunity feed →
            </Link>
          </div>
        ) : stats.territory_status === "available" ? (
          <div className="rounded-3xl border border-signal-orange/20 bg-signal-orange/5 p-6">
            <p className="text-lg font-semibold text-charcoal">This territory is available.</p>
            <p className="mt-1 text-sm text-slate">Claim it to unlock the full local opportunity feed for {trade.name}.</p>
            <div className="mt-5">
              <ClaimTerritoryButton postcodeDistrict={district} tradeCategoryId={trade.id} priceGbp={priceGbp} />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-light-grey bg-white p-6">
            <p className="text-sm font-semibold text-charcoal">This territory is already claimed exclusively.</p>
            <p className="mt-1 text-sm text-slate">
              We&apos;ll email you the moment {district} {trade.name} becomes available again.
            </p>
            <form action={joinTerritoryWaitlist.bind(null, district, trade.id, trade.slug)} className="mt-4">
              <SubmitButton
                pendingText="Joining…"
                className="rounded-xl border border-signal-orange px-4 py-2.5 text-sm font-semibold text-signal-orange transition hover:bg-signal-orange hover:text-white disabled:opacity-60"
              >
                Notify Me If Available
              </SubmitButton>
            </form>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Local signal</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Opportunity feed</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate sm:text-right">
            Counts and indicative value stay visible while specific projects remain private until the territory is active.
          </p>
        </div>

        <div className="mt-5">
          {isOwnClaim ? (
            <div className="rounded-3xl border border-success/20 bg-success/5 p-6">
              <p className="font-semibold text-charcoal">Your feed is unlocked.</p>
              <p className="mt-1 text-sm leading-6 text-slate">
                Open the dashboard to see addresses, planning references, AI scope analysis, recommendations and contact timing.
              </p>
              <Link href="/opportunities" className="mt-4 inline-flex text-sm font-semibold text-success hover:underline">
                View opportunities →
              </Link>
            </div>
          ) : (
            <LockedOpportunityPreview
              title="Specific opportunities are locked"
              body="Claim the territory to reveal actual projects, addresses, planning references, AI interpretation and the recommended next move."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-light-grey bg-white p-5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate">{label}</dt>
      <dd className="mt-2 text-xl font-bold tracking-tight text-charcoal">{value}</dd>
    </div>
  );
}
