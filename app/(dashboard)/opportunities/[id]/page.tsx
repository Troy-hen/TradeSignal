import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { OpportunityBadge, formatGbpRange } from "@/components/opportunity-badge";
import { ClaimTerritoryButton } from "@/components/claim-territory-button";
import { LeadActionPanel } from "@/components/lead-action-panel";
import { OutreachAssistant } from "@/components/outreach-assistant";
import type { Database } from "@/lib/types/database";

type Opportunity = Database["public"]["Tables"]["application_trade_opportunities"]["Row"];
type OpportunityTeaser = Database["public"]["Functions"]["browse_opportunity_teaser"]["Returns"][number];

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  // RLS (has_active_lead_match) gates this to companies holding an active
  // claim for this opportunity's district+trade — anyone else gets no row
  // back here, not an error, so the fallback below is the normal free-tier
  // path, not an error-recovery path.
  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (opportunity) {
    return <PaidBrief opportunity={opportunity} companyId={company.id} />;
  }

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
      supabase
        .from("application_classifications")
        .select("*")
        .eq("id", opportunity.application_classification_id)
        .maybeSingle(),
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

  // Opening the brief is what moves a match out of "New" — a lightweight,
  // best-effort side effect; it must never block rendering the page.
  if (leadMatchId && currentAction === null) {
    try {
      await supabase.from("lead_actions").insert({ lead_match_id: leadMatchId, company_id: companyId, action_type: "viewed" });
      await supabase.from("lead_matches").update({ viewed_at: new Date().toISOString() }).eq("id", leadMatchId);
    } catch {
      // Non-critical — the row simply stays "New" until the next successful attempt.
    }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/opportunities" className="text-sm text-slate hover:text-charcoal">
        ← Opportunities
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <OpportunityBadge bucket={opportunity.opportunity_bucket} score={opportunity.opportunity_score} />
            <h1 className="text-2xl font-semibold text-charcoal">{classification.project_type ?? "Planning application"}</h1>
          </div>
          <p className="mt-1 text-sm text-slate">
            {application.postcode_district} · {trade?.name ?? "Trade"} · {STATUS_LABELS[application.status] ?? application.status}
          </p>
        </div>
      </div>

      {classification.summary && <p className="mt-4 text-charcoal">{classification.summary}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Est. total project value" value={formatGbpRange(classification.estimated_total_project_value_low, classification.estimated_total_project_value_high)} />
        <Kpi label="Est. trade value" value={formatGbpRange(opportunity.estimated_trade_value_low, opportunity.estimated_trade_value_high)} />
        <Kpi label="Likely start" value={classification.likely_start_window ?? "—"} />
        <Kpi label="AI confidence" value={opportunity.ai_confidence !== null ? `${Math.round(opportunity.ai_confidence * 100)}%` : "—"} />
      </div>
      <p className="mt-2 text-xs text-slate">Value estimates are indicative — not a formal valuation.</p>

      <Section title="Why this matched">
        {opportunity.match_reasons && opportunity.match_reasons.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-charcoal">
            {opportunity.match_reasons.map((reason: string, i: number) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate">No reasoning recorded yet.</p>
        )}
      </Section>

      <Section title="Likely scope of work">
        {opportunity.likely_scope && opportunity.likely_scope.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-charcoal">
            {opportunity.likely_scope.map((scope: string, i: number) => (
              <li key={i}>{scope}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate">Not specified.</p>
        )}
      </Section>

      <Section title="Recommended approach">
        <p className="text-sm text-charcoal">{opportunity.recommended_action ?? "No recommendation yet."}</p>
        {opportunity.recommended_contact_timing && (
          <p className="mt-1 text-sm text-slate">Timing: {opportunity.recommended_contact_timing}</p>
        )}
        {opportunity.risk_flags && opportunity.risk_flags.length > 0 && (
          <p className="mt-2 text-sm text-warning">Risk flags: {opportunity.risk_flags.join(", ")}</p>
        )}
      </Section>

      <Section title="Planning details">
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Detail label="Address" value={application.address_text ?? "Not available"} />
          <Detail label="Planning reference" value={application.planning_reference} />
          <Detail label="Authority" value={application.local_planning_authority ?? "Unknown"} />
          <Detail label="Application type" value={application.application_type ?? "Unknown"} />
          <Detail label="Received" value={application.received_date ?? "Unknown"} />
          <Detail label="Decision due" value={application.decision_due_date ?? "—"} />
        </dl>
        {application.proposal_description && (
          <p className="mt-3 text-sm text-slate">
            <span className="font-medium text-charcoal">Proposal: </span>
            {application.proposal_description}
          </p>
        )}
        {application.source_url && (
          <a href={application.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-signal-orange hover:underline">
            View source planning record →
          </a>
        )}
      </Section>

      {updates && updates.length > 0 && (
        <Section title="Status history">
          <ul className="space-y-2 text-sm">
            {updates.map((u) => (
              <li key={u.id} className="flex items-center justify-between border-b border-light-grey pb-2 last:border-0">
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

      {leadMatchId && (
        <Section title="Track this opportunity">
          <LeadActionPanel leadMatchId={leadMatchId} currentAction={currentAction} />
        </Section>
      )}

      <div className="mt-8">
        <OutreachAssistant opportunityId={opportunity.id} />
      </div>
    </div>
  );
}

function LockedBrief({ teaser }: { teaser: OpportunityTeaser }) {
  const priceGbp = Math.round((teaser.monthly_price_pence ?? 0) / 100);
  const isAvailable = teaser.territory_status === "available";

  return (
    <div className="max-w-3xl">
      <Link href="/territories" className="text-sm text-slate hover:text-charcoal">
        ← Territory Explorer
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <OpportunityBadge bucket={teaser.opportunity_bucket} score={teaser.opportunity_score} />
        <h1 className="text-2xl font-semibold text-charcoal">{teaser.project_type ?? "Planning application"}</h1>
      </div>
      <p className="mt-1 text-sm text-slate">
        {teaser.postcode_district} · {teaser.trade_category_name} · {STATUS_LABELS[teaser.planning_status] ?? teaser.planning_status}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Kpi
          label="Est. total project value"
          value={formatGbpRange(teaser.estimated_total_project_value_low, teaser.estimated_total_project_value_high)}
        />
        <Kpi label="Est. trade value" value={formatGbpRange(teaser.estimated_trade_value_low, teaser.estimated_trade_value_high)} />
        <Kpi label="Received" value={teaser.received_date ?? "—"} />
      </dl>

      <div className="locked-panel mt-8 rounded-lg p-8">
        <div className="relative z-10 text-center text-white">
          <p className="text-lg font-semibold">
            Claiming {teaser.postcode_district} unlocks the full address, planning reference, AI scope analysis,
            match reasoning, contact timing, status history, and the outreach assistant for this opportunity.
          </p>
          {isAvailable ? (
            <div className="mt-4 flex justify-center">
              <ClaimTerritoryButton postcodeDistrict={teaser.postcode_district} tradeCategoryId={teaser.trade_category_id} priceGbp={priceGbp} />
            </div>
          ) : (
            <p className="mt-4 text-sm">This territory is already claimed exclusively by another business.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 border-t border-light-grey pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate">{label}</dt>
      <dd className="text-charcoal">{value}</dd>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-light-grey bg-white p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-charcoal">{value}</dd>
    </div>
  );
}
