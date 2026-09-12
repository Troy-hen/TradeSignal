import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { listPaidLeadUnlocks } from "@/lib/data/lead-unlocks";
import { AppPageHeader } from "@/components/app-page-header";

export default async function CrmPage() {
  const company = await requireCurrentCompany();
  const purchased = await listPaidLeadUnlocks(company.id);

  return (
    <div className="min-w-0 space-y-8">
      <AppPageHeader
        eyebrow="CRM handoff"
        title="Push purchased leads when you are ready."
        description="TradeSignal remains the source of truth for discovery, evidence and contact context. CRM connectors can be added later without making the marketplace harder to use."
        actions={<Link href="/purchased" className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Open purchased leads <span className="ml-2">→</span></Link>}
        stats={[
          { label: "Purchased leads", value: String(purchased.length), detail: "Ready for optional handoff" },
          { label: "Connectors", value: "Later", detail: "Keep the workflow focused" },
          { label: "Source of truth", value: "TradeSignal", detail: "Brief, evidence and contact route" },
        ]}
      />

      <section className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">The working flow</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Discover first. Handoff second.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FlowStep number="01" title="Review the marketplace" body="Use the teaser to decide whether the timing, likely need and supplier fit are worth pursuing." />
          <FlowStep number="02" title="Unlock the lead" body="Pay £20 for the full brief, including the available business and contact route." />
          <FlowStep number="03" title="Push when useful" body="Open the purchased lead and move it to your chosen CRM once a connector is configured." />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <ConnectorCard title="CRM connector" body="Connector setup is intentionally kept out of the core marketplace. When you are ready, we can add a push action for the CRM you use." />
        <ConnectorCard title="Export and ownership" body="Purchased leads stay available in TradeSignal. Export or connector actions should preserve the source, retrieval date, evidence and contact permissions." />
      </section>

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-charcoal">Your purchased leads are already organised</p><p className="mt-1 max-w-2xl text-sm leading-6 text-slate">Use Purchased leads for contact-ready briefs. This page is only the handoff layer, so it does not duplicate your opportunity queue.</p></div>
          <Link href="/purchased" className="shrink-0 text-sm font-semibold text-signal-orange">View purchased leads →</Link>
        </div>
      </section>
    </div>
  );
}

function FlowStep({ number, title, body }: { number: string; title: string; body: string }) {
  return <article className="rounded-2xl border border-white bg-white p-5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal-orange text-xs font-bold text-white">{number}</span><h3 className="mt-5 text-base font-bold text-charcoal">{title}</h3><p className="mt-2 text-sm leading-6 text-slate">{body}</p></article>;
}

function ConnectorCard({ title, body }: { title: string; body: string }) {
  return <article className="rounded-3xl border border-light-grey bg-white p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-charcoal">{title}</h2><span className="rounded-full bg-soft-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate">Coming later</span></div><p className="mt-3 text-sm leading-6 text-slate">{body}</p></article>;
}
