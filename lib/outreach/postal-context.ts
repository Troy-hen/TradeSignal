import "server-only";
import { createClient } from "@/lib/supabase/server";
import { deriveContactStrategy } from "@/lib/contact-intelligence/strategy";
import type { PostalRecipient } from "./postal-provider";

export async function getPostalOpportunityContext(opportunityId: string) {
  const supabase = await createClient();
  const { data: opportunity } = await supabase
    .from("application_trade_opportunities")
    .select("id, planning_application_id")
    .eq("id", opportunityId)
    .maybeSingle();
  if (!opportunity) return null;

  const { data: application } = await supabase
    .from("planning_applications")
    .select("id,address_text,postcode,applicant_name,agent_company,is_commercial,application_type,proposal_description")
    .eq("id", opportunity.planning_application_id)
    .maybeSingle();
  if (!application) return null;

  const strategy = deriveContactStrategy({
    applicantName: application.applicant_name,
    agentCompany: application.agent_company,
    isCommercial: application.is_commercial,
    applicationType: application.application_type,
    proposalDescription: application.proposal_description,
  });

  if (!application.address_text || !application.postcode) {
    return { opportunity, application, strategy, recipient: null as PostalRecipient | null };
  }

  const recipient: PostalRecipient = {
    name: strategy.suggestedRecipient,
    addressLine1: cleanAddress(application.address_text, application.postcode),
    postcode: application.postcode,
    country: "GB",
  };

  return { opportunity, application, strategy, recipient };
}

function cleanAddress(address: string, postcode: string) {
  const escaped = postcode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return address.replace(new RegExp(`\\s*,?\\s*${escaped}\\s*$`, "i"), "").trim() || address.trim();
}
