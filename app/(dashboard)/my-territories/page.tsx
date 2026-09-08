import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  reserved: { label: "Payment pending", className: "text-warning" },
  active: { label: "Active", className: "text-success" },
  suspended: { label: "Payment issue", className: "text-danger" },
  expired: { label: "Expired", className: "text-slate" },
  cancelled: { label: "Cancelled", className: "text-slate" },
};

export default async function MyTerritoriesPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const { data: claims } = await supabase
    .from("territory_claims")
    .select("id, status, reserved_at, activated_at, territory_id")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (!claims || claims.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">My Territories</h1>
        <div className="mt-6 rounded-lg border border-light-grey bg-white p-8 text-center">
          <p className="text-sm font-medium text-charcoal">You haven&apos;t claimed any territories yet.</p>
          <Link href="/territories" className="mt-3 inline-block text-sm font-medium text-signal-orange hover:underline">
            Browse the Territory Explorer →
          </Link>
        </div>
      </div>
    );
  }

  const territoryIds = [...new Set(claims.map((c) => c.territory_id))];
  const { data: territories } = await supabase
    .from("territories")
    .select("id, postcode_district, monthly_price_pence, trade_category_id")
    .in("id", territoryIds);
  const territoryById = new Map((territories ?? []).map((t) => [t.id, t]));

  const tradeIds = [...new Set((territories ?? []).map((t) => t.trade_category_id))];
  const { data: trades } = await supabase.from("trade_categories").select("id, name, slug").in("id", tradeIds);
  const tradeById = new Map((trades ?? []).map((t) => [t.id, t]));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal">My Territories</h1>
      <p className="mt-2 text-slate">Every postcode district + trade combination your business has claimed.</p>

      <ul className="mt-6 space-y-3">
        {claims.map((claim) => {
          const territory = territoryById.get(claim.territory_id);
          const trade = territory ? tradeById.get(territory.trade_category_id) : null;
          const status = STATUS_COPY[claim.status] ?? STATUS_COPY.expired;
          const priceGbp = territory ? Math.round(territory.monthly_price_pence / 100) : null;

          return (
            <li key={claim.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-light-grey bg-white p-4">
              <div>
                <p className="font-medium text-charcoal">
                  {territory?.postcode_district ?? "Unknown district"} · {trade?.name ?? "Trade"}
                </p>
                <p className={`text-sm font-medium ${status.className}`}>{status.label}</p>
              </div>
              <div className="flex items-center gap-4">
                {priceGbp !== null && <span className="text-sm text-slate">£{priceGbp}/month</span>}
                {territory && trade && (
                  <Link
                    href={`/territories/${territory.postcode_district}/${trade.slug}`}
                    className="text-sm font-medium text-signal-orange hover:underline"
                  >
                    View territory →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-sm text-slate">
        Manage payment details or cancel a territory from{" "}
        <Link href="/billing" className="font-medium text-signal-orange hover:underline">
          Billing
        </Link>
        .
      </p>
    </div>
  );
}
