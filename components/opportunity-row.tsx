import { MarketplaceCard } from "@/components/marketplace/marketplace-card";
import type { OpportunityListItem } from "@/lib/data/opportunities";

export function OpportunityRow({ item, unlocked = false }: { item: OpportunityListItem; unlocked?: boolean }) {
  return (
    <MarketplaceCard
      item={{
        opportunityId: item.opportunityId,
        title: item.projectType ?? item.entityName ?? "Buying-window opportunity",
        eyebrow: item.signalFamily ? humanize(item.signalFamily) : item.isCommercial ? "Commercial change" : "Business change",
        geography: item.locationLabel ?? `${item.district} · approximate area`,
        score: item.score,
        bucket: item.bucket,
        status: item.planningStatus,
        valueLow: item.valueLow,
        valueHigh: item.valueHigh,
        summary: item.summary,
        recommendedAction: item.recommendedAction,
        buyingWindow: item.likelyStartWindow ?? item.opportunityTiming,
        likelyNeeds: inferNeeds(item),
        signalCount: item.signalCount ?? null,
        currentAction: item.currentAction,
        sourceLabel: item.sourceKind ? humanize(item.sourceKind) : item.isCommercial ? "Commercial signal" : "Unified intelligence",
        unlocked,
      }}
    />
  );
}

function inferNeeds(item: OpportunityListItem): string[] {
  const explicitNeeds = new Set<string>(item.matchedNeeds ?? []);
  if (explicitNeeds.size > 0) return [...explicitNeeds].slice(0, 6);
  return ["Profile-matched buying signal"];
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
