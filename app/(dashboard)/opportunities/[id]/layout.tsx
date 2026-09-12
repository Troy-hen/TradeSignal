import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getOpportunityQuoteRequests } from "@/lib/data/quote-requests";
import { QuoteRequestsPanel } from "@/components/quote-requests-panel";
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

  const { data: unlocked } = await supabase.from("application_trade_opportunities").select("id").eq("id", id).maybeSingle();
  if (!unlocked) return <>{children}</>;

  const [quoteRequests, reportResult] = await Promise.all([
    getOpportunityQuoteRequests(company.id, id),
    db.from("opportunity_research_reports")
      .select("id,status,summary,report,sources,generated_at,expires_at")
      .eq("company_id", company.id)
      .eq("opportunity_id", id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <>
      <QuoteRequestsPanel requests={quoteRequests} />
      {children}
      <OpportunityResearchPanel opportunityId={id} initialReport={(reportResult.data as ResearchReport | null) ?? null} />
      <OpportunityActivityTimeline opportunityId={id} companyId={company.id} />
    </>
  );
}
