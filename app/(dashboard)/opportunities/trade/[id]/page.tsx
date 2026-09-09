import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getOwnedMarketSignal } from "@/lib/data/trade-intelligence";
import { getMarketSignalQuoteRequests } from "@/lib/data/quote-requests";
import { QuoteRequestsPanel } from "@/components/quote-requests-panel";
import { MarketSignalActionPanel } from "@/components/market-signal-action-panel";
import { formatGbpRange } from "@/components/opportunity-badge";

const LABELS: Record<string, string> = {
  tender: "Tender",
  public_pipeline: "Public-sector pipeline",
  contract_award: "Contract award",
  commercial_development: "Commercial development",
};

export default async function TradeOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const [item, quoteRequests] = await Promise.all([
    getOwnedMarketSignal(id),
    getMarketSignalQuoteRequests(company.id, id),
  ]);
  if (!item) notFound();

  const signalLabel = LABELS[item.signal_type] ?? "Trade opportunity";
  const contact = item.contact && typeof item.contact === "object" ? item.contact : {};
  const email = typeof contact.email === "string" ? contact.email : null;
  const phone = typeof contact.telephone === "string" ? contact.telephone : null;
  const contactName = typeof contact.name === "string" ? contact.name : null;

  return (
    <div className="min-w-0 space-y-6">
      <Link href="/opportunities" className="inline-flex text-sm font-semibold text-slate hover:text-charcoal">← Opportunities</Link>

      <QuoteRequestsPanel requests={quoteRequests} />

      <section className="overflow-hidden rounded-3xl border border-light-grey bg-white">
        <div className="bg-charcoal p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-signal-orange px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">{signalLabel}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">{item.postcode_district} · {item.trade_name}</span>
          </div>
          <h1 className="mt-4 max-w-5xl text-2xl font-bold tracking-tight sm:text-3xl">{item.title}</h1>
          {item.summary && <p className="mt-4 max-w-5xl text-sm leading-7 text-white/70">{item.summary}</p>}
        </div>
        <div className="grid gap-px bg-light-grey sm:grid-cols-4">
          <Metric label="Estimated project value" value={formatGbpRange(item.project_value_low, item.project_value_high)} />
          <Metric label="Estimated trade package" value={formatGbpRange(item.estimated_trade_value_low, item.estimated_trade_value_high)} />
          <Metric label="Fit score" value={item.fit_score !== null ? `${Math.round(item.fit_score)}/100` : "—"} />
          <Metric label="Deadline" value={item.deadline_at ? new Date(item.deadline_at).toLocaleDateString("en-GB") : "—"} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <Section title="MyTradeBox recommendation">
            <p className="text-sm leading-6 text-charcoal">{item.recommended_action ?? "Review the source record and decide whether this work fits your capacity and trade."}</p>
            {item.match_reasons?.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate">
                {item.match_reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </Section>

          <Section title="Commercial context">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Buyer" value={item.buyer_name ?? "Not supplied"} />
              <Detail label="Awarded supplier / main contractor" value={item.supplier_name ?? "Not yet awarded / not supplied"} />
              <Detail label="Procurement stage" value={humanize(item.procurement_stage)} />
              <Detail label="Notice type" value={humanize(item.notice_type)} />
              <Detail label="Contract start" value={item.contract_start_date ?? "—"} />
              <Detail label="Contract end" value={item.contract_end_date ?? "—"} />
              <Detail label="OCID" value={item.external_ocid ?? "—"} />
              <Detail label="CPV categories" value={item.cpv_codes?.length ? item.cpv_codes.join(", ") : "—"} />
            </dl>
          </Section>

          <Section title="Track this opportunity">
            <MarketSignalActionPanel matchId={item.market_signal_trade_match_id} currentAction={item.current_action} />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Buyer / procurement contact">
            {contactName || email || phone ? (
              <div className="space-y-3 text-sm">
                {contactName && <Detail label="Contact" value={contactName} />}
                {email && <a className="block rounded-xl border border-light-grey p-3 font-semibold text-charcoal hover:border-signal-orange/40" href={`mailto:${email}`}>Email {email}</a>}
                {phone && <a className="block rounded-xl border border-light-grey p-3 font-semibold text-charcoal hover:border-signal-orange/40" href={`tel:${phone}`}>Call {phone}</a>}
                <p className="text-xs leading-5 text-slate">Use the source notice and your own commercial judgement to confirm the appropriate procurement or subcontract contact route.</p>
              </div>
            ) : <p className="text-sm leading-6 text-slate">No contact point was supplied in the source record. Deep Research and company intelligence can help identify the appropriate buyer, design team or awarded contractor.</p>}
          </Section>

          <Section title="Source">
            <p className="text-sm text-slate">{sourceName(item.source)}</p>
            {item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-signal-orange hover:underline">Open official source →</a>}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-charcoal">{title}</h2><div className="mt-4">{children}</div></section>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate">{label}</p><p className="mt-2 text-lg font-bold text-charcoal">{value}</p></div>;
}
function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt><dd className="mt-1 break-words font-medium text-charcoal">{value}</dd></div>;
}
function humanize(value: string | null | undefined) { return value ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—"; }
function sourceName(source: string) { return ({ "find-a-tender": "Find a Tender", "contracts-finder": "Contracts Finder", "sell2wales": "Sell2Wales", "public-contracts-scotland": "Public Contracts Scotland" } as Record<string,string>)[source] ?? source; }
