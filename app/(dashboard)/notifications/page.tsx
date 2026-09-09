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

export default async function NotificationsPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const [{ data: notificationData }, { data: reminderData }] = await Promise.all([
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
  ]);

  const notifications = (notificationData ?? []) as NotificationInboxRow[];
  const reminders = (reminderData ?? []) as ReminderRow[];
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
    </div>
  );
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
