import { MarketplaceCard } from "@/components/marketplace/marketplace-card";
import type { OpportunityListItem } from "@/lib/data/opportunities";

export function OpportunityRow({ item, unlocked = false }: { item: OpportunityListItem; unlocked?: boolean }) {
  return (
    <MarketplaceCard
      item={{
        opportunityId: item.opportunityId,
        title: item.projectType ?? "Buying-window opportunity",
        eyebrow: item.isCommercial ? "Commercial change" : "Business change",
        geography: `${item.district} · approximate area`,
        score: item.score,
        bucket: item.bucket,
        status: item.planningStatus,
        valueLow: item.valueLow,
        valueHigh: item.valueHigh,
        summary: item.summary,
        recommendedAction: item.recommendedAction,
        buyingWindow: item.likelyStartWindow ?? item.opportunityTiming,
        likelyNeeds: inferNeeds(item),
        signalCount: null,
        currentAction: item.currentAction,
        sourceLabel: item.isCommercial ? "Commercial signal" : "Unified intelligence",
        unlocked,
      }}
    />
  );
}

function inferNeeds(item: OpportunityListItem): string[] {
  const text = `${item.projectType ?? ""} ${item.summary ?? ""}`.toLowerCase();
  const needs = new Set<string>();
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
  return [...needs];
}
