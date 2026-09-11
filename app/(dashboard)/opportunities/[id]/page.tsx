import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OpportunityBadge, formatGbpRange } from "@/components/opportunity-badge";
import { LockedOpportunityPreview } from "@/components/locked-opportunity-preview";
import { LeadUnlockButton } from "@/components/marketplace/lead-unlock-button";
import { LeadActionPanel } from "@/components/lead-action-panel";
import { FollowUpPanel } from "@/components/follow-up-panel";
import { ContactEnrichmentPanel } from "@/components/contact-enrichment-panel";
import { PropertyIntelligencePanel } from "@/components/property-intelligence-panel";
import { listLeadFollowUps } from "@/lib/actions/lead-follow-ups";
import { OutreachAssistant } from "@/components/outreach-assistant";
import { getOpportunityRelationshipIntelligence } from "@/lib/data/opportunity-intelligence";
import { getStoredPropertyIntelligence } from "@/lib/data/property-intelligence";
import { isPropertyIntelligenceConfigured } from "@/lib/property-intelligence";
import { findLeadUnlock, isPaidUnlock } from "@/lib/data/lead-unlocks";
import type { Database } from "@/lib/types/database";

type Opportunity = Database["public"]["Tables"]["application_trade_opportunities"]["Row"];
type OpportunityTeaser = Database["public"]["Functions"]["browse_opportunity_teaser"]["Returns"][number];

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

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const unlock = await findLeadUnlock(company.id, { opportunityId: id });
  const isUnlocked = isPaidUnlock(unlock);
  const dataClient = isUnlocked ? createAdminClient() : supabase;
  const { data: opportunity } = await dataClient.from("application_trade_opportunities").select("*").eq("id", id).maybeSingle();
  if (opportunity && isUnlocked) return <PaidBrief opportunity={opportunity} companyId={company.id} />;

  const { data: teaserRows } = await supabase.rpc("browse_opportunity_teaser", { p_opportunity_id: id });
  const teaser = Array.isArray(teaserRows) ? teaserRows[0] : teaserRows;
  if (teaser) return <LockedBrief teaser={teaser} />;
  if (opportunity) return <LockedBrief teaser={fallbackTeaser(opportunity)} />;
  notFound();
}

function fallbackTeaser(opportunity: Opportunity): OpportunityTeaser {
  return {
    id: opportunity.id,
    postcode_district: opportunity.postcode_district,
    trade_category_name: "Matched opportunity",
    project_type: null,
    planning_status: "unknown",
    estimated_trade_value_low: opportunity.estimated_trade_value_low,
    estimated_trade_value_high: opportunity.estimated_trade_value_high,
  } as OpportunityTeaser;
}

function LockedBrief({ teaser }: { teaser: OpportunityTeaser }) {
  return (
    <div className="min-w-0 space-y-6">
      <Link href="/opportunities" className="inline-flex items-center gap-2 text-sm font-semibold text-slate hover:text-charcoal">← Marketplace</Link>
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity preview</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">A qualified buying signal, ready to assess.</h1>
        <p className="mt-3 text-sm leading-6 text-slate">The preview gives you the project shape, status and indicative value. Unlock once the timing and likely need make it worth pursuing.</p>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(300px,0.38fr)]">
        <LockedOpportunityPreview teaser={{ projectType: teaser.project_type, status: teaser.planning_status, estimatedTradeValueLow: teaser.estimated_trade_value_low, estimatedTradeValueHigh: teaser.estimated_trade_value_high }} />
        <section className="h-fit rounded-3xl bg-charcoal p-6 text-white sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">One-time unlock</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">Get the complete lead.</h2>
          <p className="mt-3 text-sm leading-6 text-white/65">Reveal the company profile, contact context, evidence trail, recommended next move and CRM actions.</p>
          <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm text-white/75"><UnlockPoint label="Company and premises context" /><UnlockPoint label="Verified contact detail when available" /><UnlockPoint label="Evidence and buying-window rationale" /></div>
          <div className="mt-6"><LeadUnlockButton opportunityId={teaser.id} /></div>
          <p className="mt-3 text-center text-[11px] text-white/45">£20 · permanent access for your company · no lead bundle</p>
        </section>
      </div>
    </div>
  );
}

async function PaidBrief({ opportunity, companyId }: { opportunity: Opportunity; companyId: string }) {
  const supabase = createAdminClient();
  const [{ data: application }, { data: classification }, { data: trade }, { data: updates }, { data: matchState }] = await Promise.all([
    supabase.from("planning_applications").select("*").eq("id", opportunity.planning_application_id).maybeSingle(),
    supabase.from("application_classifications").select("*").eq("id", opportunity.application_classification_id).maybeSingle(),
    supabase.from("trade_categories").select("name").eq("id", opportunity.trade_category_id).maybeSingle(),
    supabase.from("planning_application_updates").select("id, change_type, previous_status, new_status, detected_at").eq("planning_application_id", opportunity.planning_application_id).order("detected_at", { ascending: false }),
    supabase.from("lead_match_current_state").select("lead_match_id, current_action").eq("application_trade_opportunity_id", opportunity.id).eq("company_id", companyId).maybeSingle(),
  ]);

  if (!application || !classification) notFound();
  const leadMatchId = matchState?.lead_match_id ?? null;
  const currentAction = matchState?.current_action ?? null;
  const [followUps, relationshipIntelligence, propertyIntelligence] = await Promise.all([
    leadMatchId ? listLeadFollowUps(leadMatchId) : Promise.resolve([]),
    getOpportunityRelationshipIntelligence({ planningApplicationId: application.id, tradeCategoryId: opportunity.trade_category_id, applicantName: application.applicant_name, agentCompany: application.agent_company }),
    getStoredPropertyIntelligence(companyId, opportunity.id),
  ]);

  if (leadMatchId && currentAction === null) {
    try {
      await supabase.from("lead_actions").insert({ lead_match_id: leadMatchId, company_id: companyId, action_type: "viewed" });
      await supabase.from("lead_matches").update({ viewed_at: new Date().toISOString() }).eq("id", leadMatchId);
    } catch {
      // Viewing is helpful telemetry, not a reason to fail the brief.
    }
  }

  const likelyNeeds = uniqueList([...(opportunity.likely_scope ?? []), ...(opportunity.match_reasons ?? [])]).slice(0, 6);
  const whyNow = classification.summary ?? "Recent evidence suggests this business or project is entering a relevant buying window.";
  const status = STATUS_LABELS[application.status] ?? application.status;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Link href="/opportunities" className="inline-flex items-center gap-2 text-sm font-semibold text-slate hover:text-charcoal">← Marketplace</Link><a href={`/api/opportunities/${opportunity.id}/pdf`} className="inline-flex self-start rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal hover:border-signal-orange/40 sm:self-auto">Download brief ↓</a></div>

      <section className="overflow-hidden rounded-[2rem] bg-charcoal text-white shadow-xl shadow-charcoal/10">
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><OpportunityBadge bucket={opportunity.opportunity_bucket} score={opportunity.opportunity_score} variant="tile" /><span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Planning and business signal</span></div><h1 className="mt-5 max-w-4xl break-words text-3xl font-bold tracking-tight sm:text-5xl">{classification.project_type ?? "Buying-window opportunity"}</h1><p className="mt-4 text-sm text-white/60">{application.postcode_district} · {status} · approximate opportunity area</p><p className="mt-5 max-w-3xl text-base leading-7 text-white/80">{whyNow}</p></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/45">Your fit</p><p className="mt-2 text-4xl font-bold">{opportunity.opportunity_score !== null ? `${Math.round(opportunity.opportunity_score)}` : "—"}<span className="text-base font-medium text-white/45"> / 100</span></p><p className="mt-2 text-sm font-semibold text-signal-orange">{bucketLabel(opportunity.opportunity_bucket)}</p><p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/55">Matched because the platform sees a potential need that fits your customer profile.</p></div>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-4"><HeroMetric label="Buying window" value={classification.likely_start_window ?? "Current signal"} /><HeroMetric label="Opportunity value" value={formatGbpRange(opportunity.estimated_trade_value_low, opportunity.estimated_trade_value_high)} /><HeroMetric label="Evidence confidence" value={opportunity.ai_confidence !== null ? `${Math.round(opportunity.ai_confidence * 100)}%` : "Pending"} /><HeroMetric label="Signals" value={String((opportunity.match_reasons ?? []).length || "—")} /></div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-5 sm:p-7"><SectionKicker>Why now</SectionKicker><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">The buying window in plain English.</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-charcoal">{whyNow}</p>{opportunity.recommended_contact_timing && <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-charcoal">Suggested timing: <span className="font-normal text-slate">{opportunity.recommended_contact_timing}</span></p>}</section>
          <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7"><SectionKicker>Likely needs</SectionKicker><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">What this business may buy next.</h2>{likelyNeeds.length > 0 ? <div className="mt-5 flex flex-wrap gap-2">{likelyNeeds.map((need) => <span key={need} className="rounded-full bg-soft-surface px-3 py-2 text-sm font-medium text-slate">{need}</span>)}</div> : <p className="mt-4 text-sm leading-6 text-slate">The opportunity is relevant to your profile; specific needs are still being refined from the evidence.</p>}<p className="mt-5 text-xs leading-5 text-slate">Needs are inferred from the underlying events and matched against what you sell. They are commercial guidance, not a guarantee of intent.</p></section>
          <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7"><SectionKicker>Recommended next move</SectionKicker><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Turn the signal into a conversation.</h2><p className="mt-4 text-sm leading-7 text-charcoal">{opportunity.recommended_action ?? "Review the evidence, confirm the likely buyer and choose the most relevant service angle."}</p></section>
        </div>

        <aside className="min-w-0 space-y-6"><section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7"><SectionKicker>Business context</SectionKicker><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Who is behind the signal?</h2><dl className="mt-5 grid gap-4 border-t border-light-grey pt-5"><Detail label="Business / applicant" value={application.applicant_name ?? "Not available"} /><Detail label="Agent or representative" value={application.agent_company ?? "Not supplied"} /><Detail label="Project area" value={application.address_text ?? application.postcode_district} /><Detail label="Local authority" value={application.local_planning_authority ?? "Not available"} /><Detail label="Planning reference" value={application.planning_reference} /></dl></section><ContactEnrichmentPanel intelligence={relationshipIntelligence} sourceUrl={application.source_url} /></aside>
      </div>

      <details className="group rounded-3xl border border-light-grey bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-7"><span><SectionKicker>Evidence</SectionKicker><span className="mt-2 block text-xl font-bold tracking-tight text-charcoal">What proves the signal?</span><span className="mt-1 block text-sm text-slate">Open the source record, project facts and status history.</span></span><span className="rounded-xl bg-soft-surface px-3 py-2 text-xs font-semibold text-slate transition group-open:rotate-180">⌄</span></summary><div className="grid gap-6 border-t border-light-grey p-5 sm:p-7 lg:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Source record</p><dl className="mt-4 grid gap-3 text-sm"><Detail label="Proposal" value={application.proposal_description ?? classification.project_type ?? "Not available"} /><Detail label="Received" value={application.received_date ?? "Not available"} /><Detail label="Decision due" value={application.decision_due_date ?? "Not available"} /></dl>{application.source_url && <a href={application.source_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex text-sm font-semibold text-signal-orange hover:underline">Open official source →</a>}</div><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Status history</p>{updates && updates.length > 0 ? <ul className="mt-4 space-y-3">{updates.slice(0, 8).map((update) => <li key={update.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-signal-orange" /><span className="text-charcoal">{update.previous_status ? `${humanize(update.previous_status)} → ` : ""}{humanize(update.new_status)}<span className="ml-2 text-xs text-slate">{new Date(update.detected_at).toLocaleDateString("en-GB")}</span></span></li>)}</ul> : <p className="mt-4 text-sm text-slate">No status changes recorded yet.</p>}</div></div></details>

      <details className="group rounded-3xl border border-light-grey bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-7"><span><SectionKicker>Work this lead</SectionKicker><span className="mt-2 block text-xl font-bold tracking-tight text-charcoal">Save, follow up or push to CRM.</span><span className="mt-1 block text-sm text-slate">Keep the next action close without crowding the brief.</span></span><span className="rounded-xl bg-soft-surface px-3 py-2 text-xs font-semibold text-slate transition group-open:rotate-180">⌄</span></summary><div className="space-y-5 border-t border-light-grey p-5 sm:p-7">{leadMatchId && <LeadActionPanel leadMatchId={leadMatchId} currentAction={currentAction} />}{leadMatchId && <FollowUpPanel leadMatchId={leadMatchId} opportunityId={opportunity.id} initialFollowUps={followUps} />}</div></details>

      <details className="group rounded-3xl border border-light-grey bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-7"><span><SectionKicker>Additional intelligence</SectionKicker><span className="mt-2 block text-xl font-bold tracking-tight text-charcoal">Property and contact research.</span><span className="mt-1 block text-sm text-slate">Open only when you need deeper context.</span></span><span className="rounded-xl bg-soft-surface px-3 py-2 text-xs font-semibold text-slate transition group-open:rotate-180">⌄</span></summary><div className="space-y-5 border-t border-light-grey p-5 sm:p-7"><PropertyIntelligencePanel opportunityId={opportunity.id} configured={isPropertyIntelligenceConfigured()} initialIntelligence={propertyIntelligence} /><OutreachAssistant opportunityId={opportunity.id} /></div></details>
    </div>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) { return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">{children}</p>; }
function UnlockPoint({ label }: { label: string }) { return <p className="flex items-start gap-2"><span className="mt-1 text-signal-orange">✓</span><span>{label}</span></p>; }
function HeroMetric({ label, value }: { label: string; value: string }) { return <div className="bg-white/[0.04] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p><p className="mt-2 break-words text-sm font-bold text-white">{value}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt><dd className="mt-1 break-words text-sm font-medium leading-5 text-charcoal">{value}</dd></div>; }
function uniqueList(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
function humanize(value: string | null | undefined) { return value ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Updated"; }
function bucketLabel(value: string | null) { if (value === "hot") return "Hot opportunity"; if (value === "strong") return "Warm opportunity"; if (value === "possible" || value === "low") return "Early opportunity"; return value ? humanize(value) : "Qualified signal"; }
