import Link from "next/link";

const ADMIN_NAV = [
  ["/admin", "Overview"],
  ["/admin/customers", "Customers"],
  ["/admin/revenue", "Revenue"],
  ["/admin/opportunities", "Opportunities"],
  ["/admin/unlocks", "Lead unlocks"],
  ["/admin/growth", "Growth engine"],
  ["/admin/prospects", "Prospects"],
  ["/admin/campaigns", "Campaigns"],
  ["/admin/matches", "Prospect matches"],
  ["/admin/conversions", "Conversions"],
  ["/admin/providers", "Providers"],
  ["/admin/ingestion", "Ingestion"],
  ["/admin/entity-review", "Entity review"],
  ["/admin/ai", "AI & scoring"],
  ["/admin/costs", "Costs"],
  ["/admin/compliance", "Suppression & compliance"],
  ["/admin/support", "Support"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminNav() {
  return <nav className="overflow-x-auto border-b border-light-grey bg-white" aria-label="Admin navigation"><div className="mx-auto flex min-w-max max-w-[1500px] gap-1 px-4 py-2 sm:px-6 lg:px-10">{ADMIN_NAV.map(([href, label]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate transition hover:bg-signal-orange/10 hover:text-charcoal">{label}</Link>)}</div></nav>;
}
