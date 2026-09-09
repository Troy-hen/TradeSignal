import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function OpportunityActivityTimeline({ opportunityId, companyId }: { opportunityId: string; companyId: string }) {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;

  const { data: match } = await supabase
    .from("lead_match_current_state")
    .select("lead_match_id")
    .eq("company_id", companyId)
    .eq("application_trade_opportunity_id", opportunityId)
    .maybeSingle();

  const [{ data: events }, { data: deliveries }, leadActionsResult] = await Promise.all([
    db.from("opportunity_activity_events").select("id,event_type,channel,metadata,occurred_at").eq("company_id", companyId).eq("opportunity_id", opportunityId).order("occurred_at", { ascending: false }).limit(30),
    db.from("outreach_deliveries").select("id,channel,status,provider,cost_pence,sent_at,delivered_at,created_at").eq("company_id", companyId).eq("opportunity_id", opportunityId).order("created_at", { ascending: false }).limit(20),
    match?.lead_match_id
      ? supabase.from("lead_actions").select("id,action_type,contract_value_gbp,note,created_at").eq("lead_match_id", match.lead_match_id).eq("company_id", companyId).order("created_at", { ascending: false }).limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  const items = [
    ...((leadActionsResult.data ?? []).map((row) => ({
      id: `lead-${row.id}`,
      at: row.created_at,
      label: leadActionLabel(row.action_type),
      detail: row.contract_value_gbp ? `Recorded value ${formatGbp(Number(row.contract_value_gbp))}${row.note ? ` · ${row.note}` : ""}` : row.note,
      tone: row.action_type === "won" ? "success" : row.action_type === "lost" ? "muted" : "default",
    }))),
    ...((events ?? []).map((row: { id: string; event_type: string; channel: string | null; metadata: Record<string, unknown> | null; occurred_at: string }) => ({
      id: `event-${row.id}`,
      at: row.occurred_at,
      label: eventLabel(row.event_type),
      detail: row.channel ? `Via ${humanize(row.channel)}` : null,
      tone: row.event_type === "researched" ? "accent" : "default",
    }))),
    ...((deliveries ?? []).map((row: { id: string; channel: string; status: string; provider: string | null; cost_pence: number | null; sent_at: string | null; delivered_at: string | null; created_at: string }) => ({
      id: `delivery-${row.id}`,
      at: row.delivered_at ?? row.sent_at ?? row.created_at,
      label: `${humanize(row.channel)} ${humanize(row.status)}`,
      detail: [row.provider ? `via ${row.provider}` : null, row.cost_pence ? formatGbp(row.cost_pence / 100) : null].filter(Boolean).join(" · ") || null,
      tone: row.status === "delivered" ? "success" : row.status === "failed" ? "danger" : "default",
    }))),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 20);

  if (!items.length) return null;

  return (
    <section className="mt-6 rounded-3xl border border-light-grey bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Opportunity activity</p>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-charcoal">From signal to outcome.</h2>
        </div>
        <p className="text-xs text-slate">Research, outreach and pipeline actions in one trail</p>
      </div>
      <ol className="mt-5 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3 py-2">
            <div className="flex flex-col items-center"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass(item.tone)}`} /><span className="mt-1 h-full w-px bg-light-grey last:hidden" /></div>
            <div className="min-w-0 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                <time className="text-xs text-slate">{new Date(item.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time>
              </div>
              {item.detail && <p className="mt-1 break-words text-xs leading-5 text-slate">{item.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function leadActionLabel(value: string) {
  const labels: Record<string, string> = { viewed: "Opportunity viewed", saved: "Opportunity saved", contacted: "Contacted", quoted: "Quote recorded", won: "Opportunity won", lost: "Opportunity lost" };
  return labels[value] ?? humanize(value);
}
function eventLabel(value: string) {
  const labels: Record<string, string> = { researched: "Deep Research completed", outreach_generated: "Outreach drafts generated", contact_revealed: "Contact intelligence revealed", qr_scanned: "Outreach QR scanned" };
  return labels[value] ?? humanize(value);
}
function humanize(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatGbp(value: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value); }
function dotClass(tone: string) { if (tone === "success") return "bg-success"; if (tone === "danger") return "bg-danger"; if (tone === "accent") return "bg-signal-orange"; if (tone === "muted") return "bg-slate"; return "bg-charcoal"; }
