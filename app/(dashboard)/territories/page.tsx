import { createClient } from "@/lib/supabase/server";
import { TerritorySearchForm } from "@/components/territory-search-form";

export default async function TerritoriesPage() {
  const supabase = await createClient();
  const { data: trades } = await supabase
    .from("trade_categories")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("display_order");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-charcoal">Territory Explorer</h1>
      <p className="mt-2 mb-6 text-slate">
        Search any UK postcode district and trade to see live opportunity counts, estimated
        value, and whether the exclusive territory is available.
      </p>
      <TerritorySearchForm trades={trades ?? []} />
    </div>
  );
}
