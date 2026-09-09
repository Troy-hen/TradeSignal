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

export async function getInAppNotifications(companyId: string): Promise<InAppNotificationItem[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: logData }, { data: nearbyData }] = await Promise.all([
    supabase
      .from("notification_log")
      .select("id, notification_type, subject, created_at, metadata")
      .eq("company_id", companyId)
      .eq("status", "sent")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.rpc("browse_nearby_opportunities", { p_limit: 3 }),
  ]);

  const logged = ((logData ?? []) as NotificationLogRow[]).map(notificationFromLog);
  const nearby = ((Array.isArray(nearbyData) ? nearbyData : []) as NearbyRow[]).map(notificationFromNearby);

  // A digest and an instant alert can occasionally describe the same event.
  // Keep the first item for an identical title so the global strip stays useful
  // rather than reproducing the email delivery log verbatim.
  const seenTitles = new Set<string>();
  return [...nearby, ...logged]
    .filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .slice(0, 10);
}

function notificationFromLog(row: NotificationLogRow): InAppNotificationItem {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const type = row.notification_type;
  const fallbackTitle = notificationLabel(type);

  if (type === "payment_failed") {
    return {
      id: "log:" + row.id,
      tone: "warning",
      eyebrow: "Billing",
      title: row.subject ?? "Action needed on your subscription",
      detail: "Review your billing details to keep territory access active.",
      href: "/billing",
      ctaLabel: "Review billing",
      createdAt: row.created_at,
    };
  }

  if (type === "territory_available") {
    return {
      id: "log:" + row.id,
      tone: "success",
      eyebrow: "Territory available",
      title: row.subject ?? fallbackTitle,
      detail: "An area you were watching is available to claim.",
      href: "/territories",
      ctaLabel: "View territory",
      createdAt: row.created_at,
    };
  }

  if (type === "approval_alert") {
    return {
      id: "log:" + row.id,
      tone: "signal",
      eyebrow: "Planning approved",
      title: row.subject ?? fallbackTitle,
      detail: "A matched application has moved into an important contact window.",
      href: "/opportunities",
      ctaLabel: "View opportunities",
      createdAt: row.created_at,
    };
  }

  if (type === "new_lead_instant") {
    return {
      id: "log:" + row.id,
      tone: "signal",
      eyebrow: "New opportunity",
      title: row.subject ?? fallbackTitle,
      detail: "A high-priority opportunity has been matched to your coverage.",
      href: "/opportunities",
      ctaLabel: "Open opportunities",
      createdAt: row.created_at,
    };
  }

  if (type === "nearby_opportunity_digest" || type === "outside_territory") {
    return {
      id: "log:" + row.id,
      tone: "signal",
      eyebrow: "Coverage opportunity",
      title: row.subject ?? fallbackTitle,
      detail: "There is signal outside your current coverage that may be worth a look.",
      href: safeInternalHref(metadata.preview_url) ?? "/territories",
      ctaLabel: "Explore coverage",
      createdAt: row.created_at,
    };
  }

  if (type === "announcement") {
    return {
      id: "log:" + row.id,
      tone: "info",
      eyebrow: "MyTradeBox update",
      title: row.subject ?? fallbackTitle,
      detail: typeof metadata.message === "string" ? metadata.message : null,
      href: safeInternalHref(metadata.cta_url) ?? "/notifications",
      ctaLabel: typeof metadata.cta_label === "string" ? metadata.cta_label : "View update",
      createdAt: row.created_at,
    };
  }

  return {
    id: "log:" + row.id,
    tone: "info",
    eyebrow: type.includes("digest") ? "Opportunity digest" : "Notification",
    title: row.subject ?? fallbackTitle,
    detail: null,
    href: "/notifications",
    ctaLabel: "View notifications",
    createdAt: row.created_at,
  };
}

function notificationFromNearby(row: NearbyRow): InAppNotificationItem {
  const count = Number(row.opportunity_count ?? 0);
  const project = row.teaser_project_type?.trim() || "Live planning opportunity";
  return {
    id: "nearby:" + row.postcode_district + ":" + row.trade_category_slug + ":" + String(count),
    tone: "signal",
    eyebrow: "Nearby signal",
    title: row.postcode_district + " · " + row.post_town + " is available for " + row.trade_category_name,
    detail: project + " · " + String(count) + " live " + (count === 1 ? "opportunity" : "opportunities"),
    href: "/territories/" + encodeURIComponent(row.postcode_district) + "/" + encodeURIComponent(row.trade_category_slug),
    ctaLabel: "Preview territory",
    createdAt: new Date().toISOString(),
  };
}

function notificationLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeInternalHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
