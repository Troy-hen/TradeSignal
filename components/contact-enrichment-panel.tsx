import Link from "next/link";
import type { OpportunityRelationshipIntelligence } from "@/lib/data/opportunity-intelligence";
import { PlanningContactLookup } from "@/components/planning-contact-lookup";

export function ContactEnrichmentPanel({ intelligence, sourceUrl }: { intelligence: OpportunityRelationshipIntelligence; sourceUrl: string | null }) {
  const {
    opportunityId,
    applicantName,
    agentCompany,
    organisation,
    relatedOpportunities,
    contactStrategy,
    projectAddress,
    planningContacts,
  } = intelligence;
  const businessLed = ["commercial_company", "developer", "public_sector"].includes(contactStrategy.type);

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-light-grey bg-white">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="bg-charcoal p-5 text-white sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Contact information</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight">{contactStrategy.headline}</h2>
          <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/80">{contactStrategy.label}</div>
          <p className="mt-4 text-sm leading-6 text-white/60">{contactStrategy.explanation}</p>

          {contactStrategy.primaryChannel === "postal" && projectAddress && (
            <div className="mt-5 rounded-2xl border border-signal-orange/30 bg-signal-orange/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-signal-orange">Recommended first move</p>
              <p className="mt-2 text-sm font-semibold text-white">Personalised postal letter</p>
              <p className="mt-1 text-xs leading-5 text-white/60">Address to <span className="font-semibold text-white/80">{contactStrategy.suggestedRecipient}</span> at the project address. TradeSignal does not infer a homeowner&apos;s private email or mobile.</p>
            </div>
          )}

          <div className="mt-5 space-y-3">
            <IdentityCard label="Applicant on planning record" value={applicantName ?? "Not supplied by this planning feed"} />
            <IdentityCard label="Planning agent / organisation" value={agentCompany ?? "Not supplied by this planning feed"} />
          </div>

          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex text-xs font-semibold text-white/70 transition hover:text-white">Open official planning record →</a>}
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          {planningContacts.length > 0 && (
            <div className="mb-6 rounded-2xl border border-signal-orange/20 bg-signal-orange/[0.03] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-signal-orange">Published planning contacts</p><p className="mt-1 text-sm font-semibold text-charcoal">Professional details attached to this planning record</p></div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate">Source: {planningContacts[0]?.provider}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {planningContacts.map((contact) => (
                  <div key={contact.id} className="rounded-xl border border-light-grey bg-white p-4">
                    <p className="text-sm font-semibold text-charcoal">{contact.personName ?? contact.organisationName ?? contact.jobTitle ?? "Planning contact"}</p>
                    {contact.personName && contact.organisationName && <p className="mt-1 text-xs text-slate">{contact.organisationName}</p>}
                    {contact.jobTitle && <p className="mt-1 text-xs text-slate">{contact.jobTitle}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contact.email && <a href={`mailto:${contact.email}`} className="rounded-lg bg-soft-surface px-2.5 py-1.5 text-xs font-semibold text-charcoal hover:text-signal-orange">{contact.email}</a>}
                      {contact.phone && <a href={`tel:${contact.phone}`} className="rounded-lg bg-soft-surface px-2.5 py-1.5 text-xs font-semibold text-charcoal hover:text-signal-orange">{contact.phone}</a>}
                      {contact.website && <a href={contact.website} target="_blank" rel="noreferrer" className="rounded-lg bg-soft-surface px-2.5 py-1.5 text-xs font-semibold text-charcoal hover:text-signal-orange">Website ↗</a>}
                    </div>
                    {contact.sourceUrl && <a href={contact.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[10px] font-semibold text-slate hover:text-charcoal">Verify source ↗</a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {contactStrategy.preferPlanningContactData && opportunityId && <PlanningContactLookup opportunityId={opportunityId} hasContacts={planningContacts.length > 0} />}

          {organisation ? (
            <>
              <div className={`${contactStrategy.preferPlanningContactData ? "mt-6 border-t border-light-grey pt-5" : ""} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate">Relationship signal</p>
                  <h3 className="mt-2 break-words text-lg font-bold text-charcoal">{organisation.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate">Activity associated with this organisation across planning records your workspace is already entitled to see.</p>
                </div>
                <span className="shrink-0 rounded-full bg-signal-orange/10 px-3 py-1.5 text-xs font-semibold text-signal-orange">{organisation.visibleProjects} visible project{organisation.visibleProjects === 1 ? "" : "s"}</span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Signal label="Projects" value={String(organisation.visibleProjects)} />
                <Signal label="Approved" value={String(organisation.approvedProjects)} />
                <Signal label="Districts" value={String(organisation.postcodeDistricts)} />
                <Signal label="Trade value" value={organisation.estimatedTradeValueHigh > 0 ? `${formatGbp(organisation.estimatedTradeValueHigh)}+` : "—"} />
              </dl>

              {relatedOpportunities.length > 0 ? (
                <div className="mt-6 border-t border-light-grey pt-5">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-charcoal">Related opportunities</p><p className="mt-1 text-xs text-slate">Other visible work linked to the same planning organisation.</p></div><span className="text-xs font-semibold text-slate">{relatedOpportunities.length} shown</span></div>
                  <ul className="mt-3 space-y-2">
                    {relatedOpportunities.map((item) => (
                      <li key={item.opportunityId}>
                        <Link href={`/opportunities/${item.opportunityId}`} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-light-grey px-4 py-3 transition hover:border-signal-orange/40 hover:bg-signal-orange/[0.02]">
                          <div className="min-w-0"><p className="truncate text-sm font-semibold text-charcoal">{item.projectType ?? "Planning opportunity"}</p><p className="mt-1 text-xs text-slate">{item.postcodeDistrict} · {humanize(item.planningStatus)}</p></div>
                          <div className="shrink-0 text-right"><p className="text-xs font-bold text-charcoal">{formatRange(item.valueLow, item.valueHigh)}</p><p className="mt-1 text-[10px] font-semibold text-signal-orange">Open →</p></div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <p className="mt-5 rounded-2xl bg-soft-surface p-4 text-sm leading-6 text-slate">No other matching opportunities from this organisation are currently visible in your owned territories.</p>}
            </>
          ) : (
            <div className={`${contactStrategy.preferPlanningContactData ? "mt-5" : ""} rounded-2xl bg-soft-surface p-5`}>
              <p className="text-sm font-semibold text-charcoal">{businessLed ? "No named project team came through in the planning feed." : "No planning organisation supplied."}</p>
              <p className="mt-2 text-sm leading-6 text-slate">
                {businessLed
                  ? "The project can still be commercially useful. TradeSignal will offer a published professional-contact lookup when that service is enabled; the official planning record remains the best source to verify the applicant, agent or project team meanwhile."
                  : contactStrategy.primaryChannel === "postal"
                    ? "That is expected for many homeowner-led projects. TradeSignal keeps the opportunity actionable through project-address postal outreach rather than trying to discover private consumer contact details."
                    : "The project is still actionable from its planning details, score, timing and recommended approach. Organisation intelligence appears automatically when a reliable business identity is available."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function IdentityCard({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p><p className="mt-1 break-words text-sm font-semibold leading-5 text-white">{value}</p></div>; }
function Signal({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-light-grey bg-soft-surface p-3"><dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-charcoal">{value}</dd></div>; }
function formatGbp(value: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value); }
function formatRange(low: number | null, high: number | null) { if (low === null && high === null) return "—"; if (low !== null && high !== null) return `${formatGbp(low)}–${formatGbp(high)}`; return formatGbp(high ?? low ?? 0); }
function humanize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
