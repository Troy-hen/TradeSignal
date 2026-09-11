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
  const explicitNeeds = new Set<string>([...(item.matchedNeeds ?? []), ...(item.likelyRequirements ?? [])]);
  if (explicitNeeds.size > 0) return [...explicitNeeds].slice(0, 6);
  const needs = new Set<string>(item.matchReasons ?? []);
  const text = `${item.projectType ?? ""} ${item.summary ?? ""} ${item.signalFamily ?? ""}`.toLowerCase();
  if (/restaurant|cafe|pub|hotel|hospitality|takeaway/.test(text)) {
    needs.add("Opening infrastructure");
    needs.add("EPOS and payments");
    needs.add("Fit-out services");
  }
  if (/office|retail|warehouse|industrial|commercial|premises|move|fit.?out/.test(text)) {
    needs.add("Fit-out and delivery");
    needs.add("Connectivity");
    needs.add("Security and access");
  }
  if (/care|clinic|dental|health/.test(text)) {
    needs.add("Care operations");
    needs.add("IT and compliance");
  }
  if (needs.size === 0) {
    needs.add("Project delivery");
    needs.add("Supplier services");
    needs.add("Commercial support");
  }
  return [...needs].slice(0, 6);
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
