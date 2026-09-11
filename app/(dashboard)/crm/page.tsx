import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getCompanyOpportunities, type OpportunityListItem } from "@/lib/data/opportunities";
import { OpportunityRow } from "@/components/opportunity-row";
import { AppPageHeader } from "@/components/app-page-header";

type Lane = { key: string; label: string; description: string; predicate: (item: OpportunityListItem) => boolean };

const LANES: Lane[] = [
  { key: "new", label: "New signals", description: "Qualified opportunities waiting for a decision.", predicate: (item) => item.currentAction === null },
  { key: "saved", label: "Saved", description: "Worth a closer look or a planned follow-up.", predicate: (item) => item.currentAction === "saved" || item.currentAction === "viewed" },
  { key: "contacted", label: "In progress", description: "You have started the conversation.", predicate: (item) => ["contacted", "quoted"].includes(item.currentAction ?? "") },
  { key: "won", label: "Outcomes", description: "Closed-loop results that improve future scoring.", predicate: (item) => ["won", "lost"].includes(item.currentAction ?? "") },
];

export default async function CrmPage() {
  const company = await requireCurrentCompany();
  const opportunities = await getCompanyOpportunities(company.id, { limit: 300 });

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader eyebrow="Pipeline workspace" title="Turn opportunity into outcome." description="The marketplace does not stop at discovery. Save, contact, quote, win or dismiss each signal and keep the feedback attached to the original evidence." actions={<Link href="/opportunities" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Find more opportunities <span className="ml-2">→</span></Link>} stats={LANES.map((lane) => ({ label: lane.label, value: String(opportunities.filter(lane.predicate).length), detail: lane.description }))} />

      {opportunities.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-signal-orange/30 bg-signal-orange/[0.04] p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Your pipeline is ready</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-charcoal">Save an opportunity to start building it.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate">Use the marketplace to qualify signals first. Only the opportunities you choose to work should become part of your pipeline.</p>
          <Link href="/opportunities" className="mt-5 inline-flex rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white">Open marketplace</Link>
        </section>
      ) : (
        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          {LANES.slice(0, 3).map((lane) => {
            const items = opportunities.filter(lane.predicate).slice(0, 4);
            return <section key={lane.key} className="min-w-0 overflow-hidden rounded-3xl border border-light-grey bg-white"><div className="border-b border-light-grey bg-soft-surface px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">{lane.label}</p><h2 className="mt-1 text-lg font-semibold text-charcoal">{items.length ? "Keep momentum" : "Nothing here yet"}</h2></div>{items.length > 0 && <span className="text-xs font-medium text-slate">Showing {items.length}</span>}</div></div><div className="space-y-3 p-4">{items.length ? items.map((item) => <OpportunityRow key={item.leadMatchId} item={item} />) : <p className="rounded-2xl border border-dashed border-light-grey p-6 text-center text-sm text-slate">{lane.description}</p>}</div></section>;
          })}
        </div>
      )}
    </div>
  );
}
