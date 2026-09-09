import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { NotificationInbox, type NotificationInboxRow } from "@/components/notification-inbox";

type ReminderRow = {
  id: string;
  lead_match_id: string;
  due_at: string;
  note: string | null;
  status: string;
};

type MatchRow = {
  id: string;
  application_trade_opportunity_id: string | null;
};

type OpportunityRow = {
  id: string;
  postcode_district: string;
  trade_category_id: string;
  application_classification_id: string | null;
};

type TradeRow = { id: string; name: string };
type ClassificationRow = { id: string; project_type: string | null };
type NearbyOpportunityRow = {
  postcode_district: string;
  post_town: string;
  trade_category_name: string;
  trade_category_slug: string;
  opportunity_count: number;
  estimated_trade_value_low: number;
  estimated_trade_value_high: number;
  monthly_price_pence: number;
  teaser_project_type: string | null;
  teaser_status: string | null;
  teaser_estimated_trade_value_low: number | null;
  teaser_estimated_trade_value_high: number | null;
};

export default async function NotificationsPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const [{ data: notificationData }, { data: reminderData }, { data: nearbyData }] = await Promise.all([
    supabase
      .from("notification_log")
      .select("id, notification_type, status, subject, sent_at, created_at, error_message, email_html")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("lead_follow_ups")
      .select("id, lead_match_id, due_at, note, status")
      .eq("company_id", company.id)
      .eq("status", "open")
      .order("due_at", { ascending: true })
      .limit(25),
    supabase.rpc("browse_nearby_opportunities", { p_limit: 12 }),
  ]);

  const notifications = (notificationData ?? []) as NotificationInboxRow[];
  const reminders = (reminderData ?? []) as ReminderRow[];
  const nearbyOpportunities = ((Array.isArray(nearbyData) ? nearbyData : []) as NearbyOpportunityRow[]).map((row) => ({
    ...row,
    opportunity_count: Number(row.opportunity_count),
    estimated_trade_value_low: Number(row.estimated_trade_value_low ?? 0),
    estimated_trade_value_high: Number(row.estimated_trade_value_high ?? 0),
    monthly_price_pence: Number(row.monthly_price_pence ?? 2999),
    teaser_estimated_trade_value_low: row.teaser_estimated_trade_value_low === null ? null : Number(row.teaser_estimated_trade_value_low),
    teaser_estimated_trade_value_high: row.teaser_estimated_trade_value_high === null ? null : Number(row.teaser_estimated_trade_value_high),
  }));
  const matchIds = [...new Set(reminders.map((reminder) => reminder.lead_match_id))];
  const matchRows: MatchRow[] = [];

  if (matchIds.length > 0) {
    const { data } = await supabase.from("lead_matches").select("id, application_trade_opportunity_id").in("id", matchIds);
    matchRows.push(...((data ?? []) as MatchRow[]));
  }

  const opportunityIds = [...new Set(matchRows.map((match) => match.application_trade_opportunity_id).filter(Boolean))] as string[];
  const opportunityRows: OpportunityRow[] = [];
  if (opportunityIds.length > 0) {
    const { data } = await supabase
      .from("application_trade_opportunities")
      .select("id, postcode_district, trade_category_id, application_classification_id")
      .in("id", opportunityIds);
    opportunityRows.push(...((data ?? []) as OpportunityRow[]));
  }

  const tradeIds = [...new Set(opportunityRows.map((opportunity) => opportunity.trade_category_id))];
  const { data: tradeData } = tradeIds.length > 0
    ? await supabase.from("trade_categories").select("id, name").in("id", tradeIds)
    : { data: [] };
  const trades = (tradeData ?? []) as TradeRow[];

  const classificationIds = [...new Set(opportunityRows.map((opportunity) => opportunity.application_classification_id).filter(Boolean))] as string[];
  const { data: classificationData } = classificationIds.length > 0
    ? await supabase.from("application_classifications").select("id, project_type").in("id", classificationIds)
    : { data: [] };
  const classifications = (classificationData ?? []) as ClassificationRow[];

  const matchById = new Map(matchRows.map((match) => [match.id, match]));
  const opportunityById = new Map(opportunityRows.map((opportunity) => [opportunity.id, opportunity]));
  const tradeById = new Map(trades.map((trade) => [trade.id, trade]));
  const classificationById = new Map(classifications.map((classification) => [classification.id, classification]));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Workspace inbox</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Notifications.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
          Email delivery, upcoming follow-up reminders and account activity in one place.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Next actions</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Follow-up reminders.</h2>
          <p className="mt-2 text-sm leading-6 text-slate">
            When a reminder becomes due, the notification worker sends an email to your company billing address and records the delivery here.
          </p>
          <div className="mt-6">
            {reminders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-light-grey bg-soft-surface p-5 text-sm text-slate">
                No open follow-up reminders. Add one from an opportunity brief when you need to revisit a lead.
              </div>
            ) : (
              <ul className="space-y-3">
                {reminders.map((reminder) => {
                  const match = matchById.get(reminder.lead_match_id);
                  const opportunity = match?.application_trade_opportunity_id
                    ? opportunityById.get(match.application_trade_opportunity_id)
                    : undefined;
                  const trade = opportunity ? tradeById.get(opportunity.trade_category_id) : undefined;
                  const classification = opportunity?.application_classification_id
                    ? classificationById.get(opportunity.application_classification_id)
                    : undefined;

                  return (
                    <li key={reminder.id} className="rounded-2xl border border-light-grey bg-soft-surface p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-charcoal">
                            {opportunity?.postcode_district ?? "Opportunity"} · {trade?.name ?? "Trade"}
                          </p>
                          <p className="mt-1 text-xs text-slate">
                            Due {formatDateTime(reminder.due_at)}{classification?.project_type ? " · " + classification.project_type : ""}
                          </p>
                          {reminder.note && <p className="mt-3 text-sm leading-6 text-slate">{reminder.note}</p>}
                        </div>
                        {opportunity && (
                          <Link
                            href={`/opportunities/${opportunity.id}`}
                            className="shrink-0 text-sm font-semibold text-signal-orange hover:text-[#e95f00]"
                          >
                            Open brief →
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Email delivery</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Your inbox.</h2>
            </div>
            <p className="text-xs text-slate">Latest 50 events</p>
          </div>
          <div className="mt-6">
            <NotificationInbox notifications={notifications} />
          </div>
        </section>
      </div>

      {nearbyOpportunities.length > 0 && (
        <section className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.04] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Coverage opportunity</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Nearby districts worth a look.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">These available districts are close to territory you already own and contain live planning opportunities. Claim only the areas that fit your service radius.</p>
            </div>
            <Link href="/settings" className="shrink-0 text-sm font-semibold text-signal-orange hover:text-[#e95f00]">Manage alerts →</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {nearbyOpportunities.map((opportunity) => (
              <Link
                key={opportunity.postcode_district + ":" + opportunity.trade_category_slug}
                href={`/territories/${encodeURIComponent(opportunity.postcode_district)}/${encodeURIComponent(opportunity.trade_category_slug)}`}
                className="rounded-2xl border border-signal-orange/15 bg-white p-4 transition hover:border-signal-orange hover:shadow-[0_12px_30px_rgba(255,106,0,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-charcoal">{opportunity.postcode_district} · {opportunity.post_town}</p>
                    <p className="mt-1 text-xs text-slate">{opportunity.trade_category_name} · {opportunity.opportunity_count} live opportunity{opportunity.opportunity_count === 1 ? "" : "ies"}</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Available</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-charcoal">{opportunity.teaser_project_type ?? "Planning opportunity"}</p>
                <p className="mt-1 text-xs text-slate">{formatStatus(opportunity.teaser_status)} · {formatGbpRange(opportunity.teaser_estimated_trade_value_low, opportunity.teaser_estimated_trade_value_high)}</p>
                <p className="mt-4 text-xs font-semibold text-signal-orange">Preview and claim →</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatStatus(value: string | null): string {
  if (!value) return "Status pending";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatGbpRange(low: number | null, high: number | null): string {
  const format = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
  if (low === null) return format(high);
  if (high === null) return format(low);
  return `${format(low)}–${format(high)}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
