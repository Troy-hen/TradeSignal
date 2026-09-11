import Link from "next/link";

const SECTIONS: Record<string, { label: string; purpose: string; next: string }> = {
  customers: { label: "Customers", purpose: "Customer accounts, profiles, coverage, usage, health and status.", next: "Connect customer health and profile completeness metrics." },
  revenue: { label: "Revenue", purpose: "Subscription revenue, £20 unlock revenue, refunds and gross margin.", next: "Connect the payment ledger and Stripe events." },
  opportunities: { label: "Opportunities", purpose: "Canonical opportunity inventory, quality, age, needs and geography.", next: "Add inventory quality and white-space views." },
  unlocks: { label: "Lead unlocks", purpose: "£20 purchases, enrichment success, refunds and customer access.", next: "Connect unlock validation and enrichment outcome events." },
  matches: { label: "Prospect matches", purpose: "Supplier Profiles matched to current canonical opportunities.", next: "Connect prospect opportunity matches without duplicating opportunities." },
  providers: { label: "Providers", purpose: "Data and enrichment provider health, usage, rights and credits.", next: "Connect provider adapters and cost telemetry." },
  ingestion: { label: "Ingestion", purpose: "Feed processing, freshness, failures and source coverage.", next: "Use the existing ingestion runs as the first operational view." },
  "entity-review": { label: "Entity review", purpose: "Ambiguous company, location, property and event matches.", next: "Connect the entity resolution review queue." },
  ai: { label: "AI & scoring", purpose: "Models, prompts, evidence grounding, scores and evaluation outcomes.", next: "Connect model telemetry and score evaluation data." },
  costs: { label: "Costs", purpose: "Data, enrichment, AI and provider cost against revenue.", next: "Connect cost events and customer-level margin calculations." },
  compliance: { label: "Suppression & compliance", purpose: "Unsubscribes, contact eligibility, lawful-basis metadata and suppression state.", next: "Connect the suppression list and pre-send checks before enabling campaigns." },
  support: { label: "Support", purpose: "Customer and account support tools.", next: "Connect support requests and account actions." },
  settings: { label: "Settings", purpose: "Pricing, scoring, provider, campaign and platform configuration.", next: "Expose guarded configuration with audit history." },
};

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = SECTIONS[section] ?? { label: "Admin area", purpose: "Internal platform operations.", next: "Define this admin surface." };
  return <div className="space-y-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Admin workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-charcoal">{item.label}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate">{item.purpose}</p></div><section className="rounded-3xl border border-dashed border-signal-orange/30 bg-signal-orange/[0.04] p-8 sm:p-12"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Connection point</p><h2 className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{item.next}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate">The navigation and operating model are in place. This surface should remain internal-only and use canonical platform data rather than introducing a second customer workflow.</p><Link href="/admin/growth" className="mt-5 inline-flex rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white">Open Growth Engine</Link></section></div>;
}
