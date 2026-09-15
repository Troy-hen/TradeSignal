import { getCompanyOpportunities } from "@/lib/data/opportunities";
import { getOwnedMarketSignals } from "@/lib/data/trade-intelligence";
import { listPaidLeadUnlocks } from "@/lib/data/lead-unlocks";
import { getCustomerProfile } from "@/lib/data/customer-profile";
import { rankByCustomerProfile } from "@/lib/profile/relevance";
import { listAlertRules, type AlertRule } from "@/lib/data/crm";

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

type RankedItem = InAppNotificationItem & { score: number };

/**
 * The bottom bar is a live Marketplace upsell surface, not a second inbox.
 * It deliberately shares the Marketplace queries, profile ranking and paid
 * unlock exclusions so it cannot advertise a lead that is absent or owned.
 */
export async function getInAppNotifications(companyId: string): Promise<InAppNotificationItem[]> {
  const [planning, market, paidUnlocks, profile, alertRules] = await Promise.all([
    getCompanyOpportunities(companyId, { bucket: "hot", action: "new", limit: 100 }),
    getOwnedMarketSignals(200),
    listPaidLeadUnlocks(companyId),
    getCustomerProfile(companyId),
    listAlertRules(companyId),
  ]);
  const enabledAlertRules = alertRules.filter((rule) => rule.enabled);

  const paidOpportunityIds = new Set(
    paidUnlocks
      .map((unlock) => unlock.application_trade_opportunity_id)
      .filter((value): value is string => Boolean(value)),
  );
  const paidMarketSignalIds = new Set(
    paidUnlocks
      .map((unlock) => unlock.market_signal_trade_match_id)
      .filter((value): value is string => Boolean(value)),
  );

  const planningItems: RankedItem[] = planning
    .filter((item) =>
      item.bucket === "hot" &&
      (item.currentAction === null || item.currentAction === "new") &&
      matchesAlertRules(enabledAlertRules, Number(item.score ?? 0), [item.signalFamily, item.tradeName, ...(item.matchedNeeds ?? [])], [item.locationLabel, item.district], [item.likelyStartWindow, item.opportunityTiming]) &&
      !(item.underlyingOpportunityIds ?? [item.opportunityId]).some((id) => paidOpportunityIds.has(id)),
    )
    .map((item) => {
      const score = Math.round(Number(item.score ?? 0));
      const need = item.matchedNeeds?.[0] ?? item.tradeName;
      return {
        id: "hot:planning:" + (item.canonicalOpportunityId ?? item.opportunityId),
        score,
        tone: "signal" as const,
        eyebrow: "Hot lead · " + String(score) + "/100",
        title: item.projectType ?? item.entityName ?? "New buying-window opportunity",
        detail: [item.locationLabel ?? item.district, need, "Unpurchased lead · £20 one-time unlock"].filter(Boolean).join(" · "),
        href: "/opportunities/" + encodeURIComponent(item.opportunityId),
        ctaLabel: "View brief",
        createdAt: item.matchedAt || item.receivedDate || new Date(0).toISOString(),
      };
    });

  const rankedMarket = rankByCustomerProfile(
    market.filter((item) =>
      item.opportunity_bucket === "hot" &&
      (item.current_action === null || item.current_action === "new") &&
      matchesAlertRules(enabledAlertRules, Number(item.fit_score ?? 0), [item.signal_type, item.trade_name], [item.location_label, item.postcode_district], [item.procurement_stage]) &&
      !paidMarketSignalIds.has(item.market_signal_trade_match_id),
    ),
    profile,
    (item) => [item.title, item.trade_name, item.recommended_action, item.location_label, item.buyer_name].filter(Boolean).join(" "),
  );

  const marketItems: RankedItem[] = rankedMarket.map((item) => {
    const score = Math.round(Number(item.fit_score ?? 0));
    return {
      id: "hot:market:" + item.market_signal_trade_match_id,
      score,
      tone: "signal" as const,
      eyebrow: "Hot lead · " + String(score) + "/100",
      title: item.title,
      detail: [item.location_label, item.trade_name, "Unpurchased lead · £20 one-time unlock"].filter(Boolean).join(" · "),
      href: "/opportunities/trade/" + encodeURIComponent(item.market_signal_trade_match_id),
      ctaLabel: "View brief",
      createdAt: item.published_at || item.deadline_at || new Date(0).toISOString(),
    };
  });

  return [...planningItems, ...marketItems]
    .sort((left, right) => right.score - left.score || Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 5)
    .map(({ score, ...item }) => {
      void score;
      return item;
    });
}

function matchesAlertRules(rules: AlertRule[], score: number, textValues: Array<string | null | undefined>, locationValues: Array<string | null | undefined>, windowValues: Array<string | null | undefined>) {
  if (rules.length === 0) return true;
  return rules.some((rule) => matchesAlertRule(rule, score, textValues, locationValues, windowValues));
}

function matchesAlertRule(rule: AlertRule, score: number, textValues: Array<string | null | undefined>, locationValues: Array<string | null | undefined>, windowValues: Array<string | null | undefined>) {
  if (score < Number(rule.min_score)) return false;
  return matchesAny(rule.signal_families, textValues) && matchesAny(rule.postcode_districts, locationValues) && matchesAny(rule.buying_windows, windowValues);
}

function matchesAny(filters: string[], values: Array<string | null | undefined>) {
  if (filters.length === 0) return true;
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return filters.some((filter) => filter.trim() && haystack.includes(filter.trim().toLowerCase()));
}
