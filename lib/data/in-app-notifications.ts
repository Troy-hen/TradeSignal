import { createClient } from "@/lib/supabase/server";

export type InAppNotificationItem = {
  id: string;
  tone: "signal" | "success" | "warning" | "info";
  eyebrow: string;
  title: string;
  detail: string | null;
  href: string;
  ctaLabel: string;
  createdAt: string;
};

type NotificationLogRow = {
  id: string;
  notification_type: string;
  subject: string | null;
  created_at: string;
  metadata: unknown;
  lead_match_id: string | null;
};
type NearbyRow = {
  postcode_district: string;
  post_town: string;
  trade_category_name: string;
  trade_category_slug: string;
  opportunity_count: number;
  teaser_project_type: string | null;
  teaser_status: string | null;
};
type LeadMatchRow = { id: string; application_trade_opportunity_id: string | null };
type RankedNotification = InAppNotificationItem & { priority: number };

export async function getInAppNotifications(companyId: string): Promise<InAppNotificationItem[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: logData }, { data: nearbyData }] = await Promise.all([
    supabase
      .from("notification_log")
      .select("id, notification_type, subject, created_at, metadata, lead_match_id")
      .eq("company_id", companyId)
      .eq("status", "sent")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.rpc("browse_nearby_opportunities", { p_limit: 3 }),
  ]);

  const logs = (logData ?? []) as NotificationLogRow[];
  const leadMatchIds = [...new Set(logs.map((row) => row.lead_match_id).filter((id): id is string => Boolean(id)))];
  const { data: matchData } = leadMatchIds.length > 0
    ? await supabase.from("lead_matches").select("id, application_trade_opportunity_id").in("id", leadMatchIds)
    : { data: [] as LeadMatchRow[] };
  const opportunityByMatch = new Map(((matchData ?? []) as LeadMatchRow[]).map((row) => [row.id, row.application_trade_opportunity_id]));

  const logged = logs.map((row) => notificationFromLog(row, row.lead_match_id ? opportunityByMatch.get(row.lead_match_id) ?? null : null));
  const nearby = ((Array.isArray(nearbyData) ? nearbyData : []) as NearbyRow[]).map(notificationFromNearby);

  const seenTitles = new Set<string>();
  return [...logged, ...nearby]
    .sort((a, b) => b.priority - a.priority || Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .slice(0, 10)
    .map(({ priority: _priority, ...item }) => item);
}

function notificationFromLog(row: NotificationLogRow, opportunityId: string | null): RankedNotification {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const type = row.notification_type;
  const fallbackTitle = notificationLabel(type);
  const opportunityHref = opportunityId ? "/opportunities/" + encodeURIComponent(opportunityId) : "/opportunities";

  if (type === "payment_failed") return ranked(100, row, "warning", "Billing", row.subject ?? "Action needed on your subscription", "Review your billing details to keep territory access active.", "/billing", "Review billing");
  if (type === "approval_alert") return ranked(90, row, "signal", "Planning approved", row.subject ?? fallbackTitle, "A matched application has moved into an important contact window.", opportunityHref, opportunityId ? "Open opportunity" : "View opportunities");
  if (type === "new_lead_instant") return ranked(80, row, "signal", "New opportunity", row.subject ?? fallbackTitle, "A high-priority opportunity has been matched to your coverage.", opportunityHref, opportunityId ? "Open opportunity" : "Open opportunities");
  if (type === "follow_up_reminder") return ranked(70, row, "warning", "Follow-up due", row.subject ?? fallbackTitle, "A lead follow-up is due now.", opportunityHref, opportunityId ? "Open opportunity" : "View follow-ups");
  if (type === "territory_available") return ranked(60, row, "success", "Territory available", row.subject ?? fallbackTitle, "An area you were watching is available to claim.", safeInternalHref(metadata.claim_url) ?? "/territories", "View territory");
  if (type === "nearby_opportunity_digest" || type === "outside_territory") return ranked(50, row, "signal", "Coverage opportunity", row.subject ?? fallbackTitle, "There is signal outside your current coverage that may be worth a look.", safeInternalHref(metadata.preview_url) ?? "/territories", "Explore territory");
  if (type === "announcement") return ranked(40, row, "info", "MyTradeBox update", row.subject ?? fallbackTitle, typeof metadata.message === "string" ? metadata.message : null, safeInternalHref(metadata.cta_url) ?? "/notifications", typeof metadata.cta_label === "string" ? metadata.cta_label : "View update");
  if (type.includes("digest")) return ranked(20, row, "info", "Opportunity digest", row.subject ?? fallbackTitle, null, "/notifications", "View digest");
  return ranked(30, row, "info", "Notification", row.subject ?? fallbackTitle, null, "/notifications", "View notifications");
}

function notificationFromNearby(row: NearbyRow): RankedNotification {
  const count = Number(row.opportunity_count ?? 0);
  const project = row.teaser_project_type?.trim() || "Live planning opportunity";
  return {
    id: "nearby:" + row.postcode_district + ":" + row.trade_category_slug + ":" + String(count),
    priority: 45,
    tone: "signal",
    eyebrow: "Nearby signal",
    title: row.postcode_district + " · " + row.post_town + " is available for " + row.trade_category_name,
    detail: project + " · " + String(count) + " live " + (count === 1 ? "opportunity" : "opportunities"),
    href: "/territories/" + encodeURIComponent(row.postcode_district) + "/" + encodeURIComponent(row.trade_category_slug),
    ctaLabel: "Preview territory",
    createdAt: new Date().toISOString(),
  };
}

function ranked(priority: number, row: NotificationLogRow, tone: InAppNotificationItem["tone"], eyebrow: string, title: string, detail: string | null, href: string, ctaLabel: string): RankedNotification {
  return { id: "log:" + row.id, priority, tone, eyebrow, title, detail, href, ctaLabel, createdAt: row.created_at };
}

function notificationLabel(value: string): string { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function safeInternalHref(value: unknown): string | null { if (typeof value !== "string") return null; return value.startsWith("/") && !value.startsWith("//") ? value : null; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
