import { MarketplaceCard } from "@/components/marketplace/marketplace-card";
import type { OwnedMarketSignal } from "@/lib/data/trade-intelligence";

export function MarketSignalRow({ item, unlocked = false }: { item: OwnedMarketSignal; unlocked?: boolean }) {
  return (
    <MarketplaceCard
      item={{
        marketSignalId: item.market_signal_trade_match_id,
        title: item.title,
        eyebrow: labelForSignal(item.signal_type),
        geography: `${item.location_label}${item.location_scope === "regional" ? " · regional" : " · approximate area"}`,
        score: item.fit_score,
        bucket: item.opportunity_bucket,
        status: item.procurement_stage,
        valueLow: item.estimated_trade_value_low,
        valueHigh: item.estimated_trade_value_high,
        summary: item.recommended_action ? `Recommended next move: ${item.recommended_action}` : "A public or commercial signal has been matched to your profile and coverage.",
        recommendedAction: item.recommended_action,
        buyingWindow: item.deadline_at ? `Deadline ${new Date(item.deadline_at).toLocaleDateString("en-GB")}` : "Current signal",
        likelyNeeds: ["Relevant delivery capability", "Evidence-backed brief", "Contact detail after unlock"],
        signalCount: 1,
        currentAction: item.current_action,
        sourceLabel: "Unified intelligence",
        unlocked,
      }}
    />
  );
}

function labelForSignal(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
