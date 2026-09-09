import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getPostalOutreachProvider } from "@/lib/outreach/postal-provider";

export async function POST() {
  const company = await requireCurrentCompany();
  const provider = getPostalOutreachProvider();
  if (!provider) return NextResponse.json({ synced: 0 });

  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { data: deliveries } = await db
    .from("outreach_deliveries")
    .select("id,opportunity_id,lead_match_id,provider_job_id,status")
    .eq("company_id", company.id)
    .eq("provider", provider.name)
    .in("status", ["queued", "sent"])
    .not("provider_job_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  let synced = 0;
  for (const delivery of deliveries ?? []) {
    try {
      const result = await provider.getStatus(String(delivery.provider_job_id));
      if (result.status === delivery.status) continue;
      const now = new Date().toISOString();
      await db
        .from("outreach_deliveries")
        .update({
          status: result.status,
          tracking_url: result.trackingUrl ?? null,
          delivered_at: result.status === "delivered" ? now : null,
          failed_at: result.status === "failed" ? now : null,
          error_message: result.errorMessage ?? null,
          updated_at: now,
        })
        .eq("id", delivery.id)
        .eq("company_id", company.id);

      await db.from("opportunity_activity_events").insert({
        company_id: company.id,
        opportunity_id: delivery.opportunity_id,
        lead_match_id: delivery.lead_match_id,
        event_type: `letter_${result.status}`,
        channel: "letter",
        provider: provider.name,
        provider_reference: delivery.provider_job_id,
        metadata: { delivery_id: delivery.id },
      });
      synced++;
    } catch (error) {
      console.warn("Could not sync postal delivery", delivery.id, error);
    }
  }

  return NextResponse.json({ synced });
}
