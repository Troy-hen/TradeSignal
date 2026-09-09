import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { OpportunityResearchPanel } from "@/components/opportunity-research-panel";
import { OpportunityActivityTimeline } from "@/components/opportunity-activity-timeline";

type ResearchReport = {
  id: string;
  status: string;
  summary: string | null;
  report: {
    executiveSummary?: string;
    commercialAssessment?: string;
    whoToApproach?: string;
    timing?: string;
    relationshipSignal?: string;
    risks?: string[];
    nextActions?: string[];
    externalFindings?: string[];
  };
  sources: Array<{ title?: string; url?: string }>;
  generated_at: string | null;
  expires_at: string | null;
};

export default async function OpportunityDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;

  // RLS makes this null for a teaser-only opportunity. Research/activity is
  // therefore shown only when the workspace is entitled to the full brief.
  const { data: unlocked } = await supabase
    .from("application_trade_opportunities")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!unlocked) return <>{children}</>;

  const { data: report } = await db
    .from("opportunity_research_reports")
    .select("id,status,summary,report,sources,generated_at,expires_at")
    .eq("company_id", company.id)
    .eq("opportunity_id", id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      {children}
      <OpportunityResearchPanel opportunityId={id} initialReport={(report as ResearchReport | null) ?? null} />
      <OpportunityActivityTimeline opportunityId={id} companyId={company.id} />
    </>
  );
}
