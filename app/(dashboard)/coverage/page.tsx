import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import {
  CoverageBuilder,
  CoveragePlanEditor,
  type CoverageDistrictOption,
  type CoveragePlanView,
  type CoverageTradeOption,
} from "@/components/coverage-builder";

export default async function CoveragePage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase;

  const [{ data: trades }, { data: postcodeDistricts }, { data: coverageAreas }] = await Promise.all([
    supabase
      .from("trade_categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("display_order"),
    supabase.from("postcode_districts").select("id, post_town").order("id"),
    db.from("coverage_areas").select("id, name").eq("is_active", true).order("name"),
  ]);

  const { data: plans } = await db
    .from("coverage_plans")
    .select("id, trade_category_id, status, billing_mode, monthly_price_pence")
    .eq("company_id", company.id)
    .in("status", ["reserved", "active", "pending_change", "suspended"])
    .order("created_at");

  const planViews: CoveragePlanView[] = [];
  for (const plan of plans ?? []) {
    const { data: items } = await db
      .from("coverage_plan_items")
      .select("postcode_district, status")
      .eq("coverage_plan_id", plan.id)
      .in("status", ["active", "pending_add"])
      .order("postcode_district");

    const trade = (trades ?? []).find((item) => item.id === plan.trade_category_id);
    planViews.push({
      id: plan.id,
      tradeCategoryId: plan.trade_category_id,
      tradeName: trade?.name ?? "Trade coverage",
      status: plan.status,
      billingMode: plan.billing_mode,
      monthlyPricePence: plan.monthly_price_pence,
      districts: (items ?? []).map((item: { postcode_district: string }) => item.postcode_district),
    });
  }

  const tradeOptions: CoverageTradeOption[] = (trades ?? []).map((trade) => ({
    id: trade.id,
    name: trade.name,
    slug: trade.slug,
  }));
  const districtOptions: CoverageDistrictOption[] = (postcodeDistricts ?? []).map((district) => ({
    id: district.id,
    town: district.post_town ?? "Other",
  }));
  const existingTradeIds = planViews.map((plan) => plan.tradeCategoryId);
  const areas = (coverageAreas ?? []) as { id: string; name: string }[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Coverage</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Own the areas you actually serve.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
            Group postcode districts around each trade, see the price before checkout and keep your service area flexible as the business changes.
          </p>
        </div>
        <Link href="/pricing" className="text-sm font-semibold text-signal-orange hover:text-[#e95f00]">
          View pricing →
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Core price" value="£29.99" detail="First postcode district per trade" />
        <SummaryCard label="Volume pricing" value="From £24.99" detail="Additional districts reduce the unit price" />
        <SummaryCard label="County bundle" value="20% off" detail="Applied once verified boundaries are available" />
      </section>

      {planViews.length > 0 && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">Your coverage</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Current plans</h2>
          </div>
          {planViews.map((plan) => (
            <CoveragePlanEditor key={plan.id} plan={plan} districts={districtOptions} />
          ))}
        </div>
      )}

      <CoverageBuilder
        trades={tradeOptions}
        districts={districtOptions}
        existingTradeIds={existingTradeIds}
        countyAreas={areas}
      />

      <section className="rounded-3xl bg-charcoal p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Built for real service areas</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Start with the postcode that pays for itself.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          You are never asked to buy an entire region before you know it works. Start small, add districts when the signal justifies it, and keep a clear monthly ceiling.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
          <span>✓ Real planning applications</span>
          <span>✓ Indicative trade value</span>
          <span>✓ Exclusive by trade and district</span>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-light-grey bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate">{detail}</p>
    </div>
  );
}
