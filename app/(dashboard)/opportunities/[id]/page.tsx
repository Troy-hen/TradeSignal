import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { OpportunityBadge, formatGbpRange } from "@/components/opportunity-badge";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";
import { LeadActionPanel } from "@/components/lead-action-panel";
import { FollowUpPanel } from "@/components/follow-up-panel";
import { ContactEnrichmentPanel } from "@/components/contact-enrichment-panel";
import { PropertyIntelligencePanel } from "@/components/property-intelligence-panel";
import { listLeadFollowUps } from "@/lib/actions/lead-follow-ups";
import { OutreachAssistant } from "@/components/outreach-assistant";
import { getOpportunityRelationshipIntelligence } from "@/lib/data/opportunity-intelligence";
import { getStoredPropertyIntelligence } from "@/lib/data/property-intelligence";
import { isPropertyIntelligenceConfigured } from "@/lib/property-intelligence";
import type { Database } from "@/lib/types/database";

type Opportunity = Database["public"]["Tables"]["application_trade_opportunities"]["Row"];
type OpportunityTeaser = Database["public"]["Functions"]["browse_opportunity_teaser"]["Returns"][number];

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (opportunity) return <PaidBrief opportunity={opportunity} companyId={company.id} />;

  const { data: teaserRows } = await supabase.rpc("browse_opportunity_teaser", { p_opportunity_id: id });
  const teaser = Array.isArray(teaserRows) ? teaserRows[0] : teaserRows;
  if (!teaser) notFound();
  return <LockedBrief teaser={teaser} />;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  validated: "Validated",
  under_consideration: "Under consideration",
  decision_expected: "Decision expected",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  appeal_lodged: "Appeal lodged",
  unknown: "Unknown",
};

async function PaidBrief({ opportunity, companyId }: { opportunity: Opportunity; companyId: string }) {
  const supabase = await createClient();

  const [{ data: application }, { data: classification }, { data: trade }, { data: updates }, { data: matchState }] =
    await Promise.all([
      supabase.from("planning_applications").select("*").eq("id", opportunity.planning_application_id).maybeSingle(),
      supabase.from("application_classifications").select("*").eq("id", opportunity.application_classification_id).maybeSingle(),
      supabase.from("trade_categories").select("name").eq("id", opportunity.trade_category_id).maybeSingle(),
      supabase
        .from("planning_application_updates")
        .select("id, change_type, previous_status, new_status, detected_at")
        .eq("planning_application_id", opportunity.planning_application_id)
        .order("detected_at", { ascending: false }),
      supabase
        .from("lead_match_current_state")
        .select("lead_match_id, current_action")
        .eq("application_trade_opportunity_id", opportunity.id)
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);

  if (!application || !classification) notFound();

  const leadMatchId = matchState?.lead_match_id ?? null;
  const currentAction = matchState?.current_action ?? null;
  const [followUps, relationshipIntelligence, propertyIntelligence] = await Promise.all([
    leadMatchId ? listLeadFollowUps(leadMatchId) : Promise.resolve([]),
    getOpportunityRelationshipIntelligence({
      planningApplicationId: application.id,
      tradeCategoryId: opportunity.trade_category_id,
      applicantName: application.applicant_name,
      agentCompany: application.agent_company,
    }),
    getStoredPropertyIntelligence(companyId, opportunity.id),
  ]);
  const propertyIntelligenceConfigured = isPropertyIntelligenceConfigured();

  if (leadMatchId && currentAction === null) {
    try {
      await supabase.from("lead_actions").insert({ lead_match_id: leadMatchId, company_id: companyId, action_type: "viewed" });
      await supabase.from("lead_matches").update({ viewed_at: new Date().toISOString() }).eq("id", leadMatchId);
    } catch {
      // Non-critical — the match remains New until a later successful attempt.
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/opportunities" className="inline-flex items-center gap-2 text-sm font-semibold text-slate transition hover:text-charcoal">
          ← Opportunities
        </Link>
        <a
          href={`/api/opportunities/${opportunity.id}/pdf`}
          className="inline-flex self-start rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange sm:self-auto"
        >
          Download brief PDF ↓
        </a>
      </div>

      <div className="mt-4 rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <OpportunityBadge bucket={opportunity.opportunity_bucket} score={opportunity.opportunity_score} variant="tile" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity brief</p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                  {classification.project_type ?? "Planning application"}
                </h1>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate">
              {application.postcode_district} · {trade?.name ?? "Trade"} · {STATUS_LABELS[application.status] ?? application.status}
            </p>
          </div>
        </div>
        {classification.summary && <p className="mt-5 max-w-4xl text-base leading-7 text-charcoal">{classification.summary}</p>}
      </div>

      <MyTradeBoxIntelligence
        classification={classification}
        opportunity={opportunity}
        keyFacts={formatKeyFacts(classification.key_facts)}
      />

      <PropertyIntelligencePanel
        opportunityId={opportunity.id}
        configured={propertyIntelligenceConfigured}
        initialIntelligence={propertyIntelligence}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Est. total project value" value={formatGbpRange(classification.estimated_total_project_value_low, classification.estimated_total_project_value_high)} />
        <Kpi label="Est. trade value" value={formatGbpRange(opportunity.estimated_trade_value_low, opportunity.estimated_trade_value_high)} />
        <Kpi label="Likely start" value={classification.likely_start_window ?? "—"} />
        <Kpi label="AI confidence" value={opportunity.ai_confidence !== null ? `${Math.round(opportunity.ai_confidence * 100)}%` : "—"} />
      </div>
      <p className="mt-3 text-xs text-slate">Value estimates are indicative — not a formal valuation.</p>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Section title="Why this matched" flush>
          {opportunity.match_reasons && opportunity.match_reasons.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-charcoal">
              {opportunity.match_reasons.map((reason: string, i: number) => <li key={i}>{reason}</li>)}
            </ul>
          ) : <p className="text-sm text-slate">No reasoning recorded yet.</p>}
        </Section>
        <Section title="Likely scope of work" flush>
          {opportunity.likely_scope && opportunity.likely_scope.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-charcoal">
              {opportunity.likely_scope.map((scope: string, i: number) => <li key={i}>{scope}</li>)}
            </ul>
          ) : <p className="text-sm text-slate">Not specified.</p>}
        </Section>
      </div>

      <Section title="Recommended approach">
        <p className="text-sm text-charcoal">{opportunity.recommended_action ?? "No recommendation yet."}</p>
        {opportunity.recommended_contact_timing && <p className="mt-1 text-sm text-slate">Timing: {opportunity.recommended_contact_timing}</p>}
        {opportunity.risk_flags && opportunity.risk_flags.length > 0 && <p className="mt-2 text-sm text-warning">Risk flags: {opportunity.risk_flags.join(", ")}</p>}
      </Section>

      <Section title="Planning details">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <Detail label="Address" value={application.address_text ?? "Not available"} />
          <Detail label="Planning reference" value={application.planning_reference} />
          <Detail label="Authority" value={application.local_planning_authority ?? "Unknown"} />
          <Detail label="Application type" value={application.application_type ?? "Unknown"} />
          <Detail label="Received" value={application.received_date ?? "Unknown"} />
          <Detail label="Decision due" value={application.decision_due_date ?? "—"} />
        </dl>
        {application.proposal_description && <p className="mt-4 text-sm leading-6 text-slate"><span className="font-medium text-charcoal">Proposal: </span>{application.proposal_description}</p>}
        {application.source_url && <a href={application.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-signal-orange hover:underline">View source planning record →</a>}
      </Section>

      <ContactEnrichmentPanel intelligence={relationshipIntelligence} sourceUrl={application.source_url} />

      {updates && updates.length > 0 && (
        <Section title="Status history">
          <ul className="space-y-2 text-sm">
            {updates.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-light-grey pb-2 last:border-0">
                <span className="text-charcoal">
                  {u.previous_status ? `${STATUS_LABELS[u.previous_status] ?? u.previous_status} → ` : ""}
                  {u.new_status ? STATUS_LABELS[u.new_status] ?? u.new_status : "Updated"}
                </span>
                <span className="text-slate">{new Date(u.detected_at).toLocaleDateString("en-GB")}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {leadMatchId && <Section title="Track this opportunity"><LeadActionPanel leadMatchId={leadMatchId} currentAction={currentAction} /></Section>}
      {leadMatchId && <Section title="Follow-up reminders"><FollowUpPanel leadMatchId={leadMatchId} opportunityId={opportunity.id} initialFollowUps={followUps} /></Section>}

      <div className="mt-8"><OutreachAssistant opportunityId={opportunity.id} /></div>
    </div>
  );
}

function MyTradeBoxIntelligence({ classification, opportunity, keyFacts }: {
  classification: Database["public"]["Tables"]["application_classifications"]["Row"];
  opportunity: Opportunity;
  keyFacts: string[];
}) {
  const confidence = classification.ai_confidence !== null ? `${Math.round(classification.ai_confidence * 100)}%` : "Pending";
  const statusLabel = classification.classification_status === "completed" ? "Intelligence ready" : `Status: ${humanize(classification.classification_status)}`;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.04]">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-orange/10 text-lg text-signal-orange" aria-hidden="true">✦</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">MyTradeBox intelligence</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-charcoal">What this project means for your trade</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-charcoal">{classification.summary ?? "The intelligence read for this application is still being prepared."}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-signal-orange/20 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Confidence</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-charcoal">{confidence}</p>
          <p className="mt-1 text-xs font-medium text-slate">{statusLabel}</p>
        </div>
      </div>

      <div className="grid gap-px border-t border-signal-orange/10 bg-signal-orange/10 sm:grid-cols-3">
        <InterpretationMetric label="Project scale" value={humanize(classification.project_size_category)} />
        <InterpretationMetric label="Likely start" value={classification.likely_start_window ?? "Not available"} />
        <InterpretationMetric label="Best contact window" value={opportunity.recommended_contact_timing ?? classification.opportunity_timing ?? "Not available"} />
      </div>

      {keyFacts.length > 0 && (
        <div className="border-t border-signal-orange/10 px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Key facts</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {keyFacts.map((fact) => <li key={fact} className="flex items-start gap-2 text-sm text-charcoal"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-orange" /><span>{fact}</span></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

function InterpretationMetric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white/70 px-5 py-4 sm:px-6"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">{label}</p><p className="mt-1 text-sm font-semibold leading-5 text-charcoal">{value}</p></div>;
}

function humanize(value: string | null | undefined): string {
  if (!value) return "Not available";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatKeyFacts(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").slice(0, 6);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, raw]) => typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? [humanize(key) + ": " + String(raw)] : [])
    .slice(0, 6);
}

function LockedBrief({ teaser }: { teaser: OpportunityTeaser }) {
  return (
    <div className="min-w-0">
      <Link href="/opportunities" className="inline-flex items-center gap-2 text-sm font-semibold text-slate transition hover:text-charcoal">← Marketplace</Link>
      <div className="mt-4 rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity preview</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">See the opportunity brief</h1>
        <p className="mt-3 text-sm text-slate">{teaser.postcode_district} · {teaser.trade_category_name}</p>
      </div>
      <div className="mt-6"><LockedOpportunityPreview title="Unlock the full brief for £20" body="Choose this individual opportunity to reveal the company, contact detail, evidence trail and recommended next move." teaser={{ projectType: teaser.project_type, status: teaser.planning_status, estimatedTradeValueLow: teaser.estimated_trade_value_low, estimatedTradeValueHigh: teaser.estimated_trade_value_high }} /></div>
      <div className="mt-6 rounded-3xl border border-light-grey bg-charcoal p-6 text-white">
        <p className="font-semibold">Make this opportunity actionable</p>
        <p className="mt-1 text-sm text-white/60">The preview is free. Unlock this individual lead for £20 to reveal the complete brief and contact detail, then push it into your CRM.</p>
        <Link href="/coverage" className="mt-4 inline-flex rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">Review coverage and unlocks →</Link>
      </div>
    </div>
  );
}

function Section({ title, children, flush = false }: { title: string; children: React.ReactNode; flush?: boolean }) {
  return <section className={(flush ? "" : "mt-5 ") + "rounded-2xl border border-light-grey bg-white p-5 sm:p-6"}><h2 className="text-sm font-semibold text-charcoal">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl bg-soft-surface p-3"><dt className="text-xs text-slate">{label}</dt><dd className="mt-1 break-words text-charcoal">{value}</dd></div>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-light-grey bg-white p-4"><dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate">{label}</dt><dd className="mt-2 break-words text-lg font-bold tracking-tight text-charcoal">{value}</dd></div>;
}
