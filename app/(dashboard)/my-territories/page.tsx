import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";

const STATUS_COPY: Record<string, { label: string; className: string; dot: string }> = {
  reserved: { label: "Payment pending", className: "text-warning", dot: "bg-warning" },
  active: { label: "Active", className: "text-success", dot: "bg-success" },
  suspended: { label: "Payment issue", className: "text-danger", dot: "bg-danger" },
  expired: { label: "Expired", className: "text-slate", dot: "bg-slate" },
  cancelled: { label: "Cancelled", className: "text-slate", dot: "bg-slate" },
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
      <div className="space-y-8">
        <PageIntro />
        <div className="rounded-3xl border border-dashed border-light-grey bg-white p-10 text-center sm:p-14">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-orange/10 text-xl text-signal-orange">⌂</div>
          <h2 className="mt-5 text-lg font-semibold text-charcoal">You haven&apos;t claimed any territories yet.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">
            Choose an area and trade to create your first focused opportunity feed.
          </p>
          <Link href="/territories" className="mt-5 inline-flex rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e95f00]">
            Find a territory <span className="ml-2">→</span>
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
    <div className="space-y-8">
      <PageIntro />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate">{claims.length} {claims.length === 1 ? "territory" : "territories"} linked to your business</p>
        <Link href="/territories" className="text-sm font-semibold text-signal-orange hover:text-[#e95f00]">Add territory →</Link>
      </div>

      <ul className="grid gap-4 xl:grid-cols-2">
        {claims.map((claim) => {
          const territory = territoryById.get(claim.territory_id);
          const trade = territory ? tradeById.get(territory.trade_category_id) : null;
          const status = STATUS_COPY[claim.status] ?? STATUS_COPY.expired;
          const priceGbp = territory ? Math.round(territory.monthly_price_pence / 100) : null;

          return (
            <li key={claim.id} className="rounded-3xl border border-light-grey bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Exclusive territory</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-charcoal">
                    {territory?.postcode_district ?? "Unknown district"}
                  </h2>
                  <p className="mt-1 text-sm text-slate">{trade?.name ?? "Trade"}</p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full bg-soft-surface px-3 py-1.5 text-xs font-semibold ${status.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Metric label="Monthly access" value={priceGbp !== null ? `£${priceGbp}` : "—"} />
                <Metric label="Trade" value={trade?.name ?? "—"} />
              </div>

              {territory && trade && (
                <Link
                  href={`/territories/${territory.postcode_district}/${trade.slug}`}
                  className="mt-5 inline-flex text-sm font-semibold text-signal-orange hover:text-[#e95f00]"
                >
                  View territory details →
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-slate">
        Manage payment details or cancel a territory from <Link href="/billing" className="font-semibold text-signal-orange hover:text-[#e95f00]">Billing</Link>.
      </p>
    </div>
  );
}

function PageIntro() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Territory management</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">My territories.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">The postcode districts and trades your business currently owns.</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-light-grey bg-soft-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-charcoal">{value}</p>
    </div>
  );
}
