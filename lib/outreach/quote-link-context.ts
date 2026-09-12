import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveQuoteLink } from "@/lib/outreach/response-links";

export async function getPublicQuoteLinkContext(token: string) {
  const link = await resolveQuoteLink(token);
  if (!link) return null;
  const admin = createAdminClient() as unknown as SupabaseClient;

  const [{ data: company }, { data: opportunity }] = await Promise.all([
    admin
      .from("companies")
      .select("trading_name,phone,website,logo_url")
      .eq("id", link.companyId)
      .maybeSingle(),
    admin
      .from("application_trade_opportunities")
      .select("trade_category_id,application_classification_id")
      .eq("id", link.opportunityId)
      .maybeSingle(),
  ]);
  if (!company || !opportunity) return null;

  const [{ data: trade }, { data: classification }] = await Promise.all([
    admin.from("trade_categories").select("name").eq("id", opportunity.trade_category_id).maybeSingle(),
    admin.from("application_classifications").select("project_type").eq("id", opportunity.application_classification_id).maybeSingle(),
  ]);

  return {
    link,
    company: {
      tradingName: String(company.trading_name),
      phone: typeof company.phone === "string" && company.phone.trim() ? company.phone.trim() : null,
      website: typeof company.website === "string" && company.website.trim() ? company.website.trim() : null,
      logoUrl: typeof company.logo_url === "string" && company.logo_url.trim() ? company.logo_url.trim() : null,
    },
    project: {
      tradeName: trade?.name ? String(trade.name) : "local trade work",
      projectType: classification?.project_type ? String(classification.project_type) : null,
    },
  };
}
