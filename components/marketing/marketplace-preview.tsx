"use client";

import { useState } from "react";
import { MarketplaceCard, type MarketplaceCardData } from "@/components/marketplace/marketplace-card";

const PREVIEW_ITEMS: MarketplaceCardData[] = [
  {
    title: "New hospitality venue entering a fit-out window",
    eyebrow: "Opening signal",
    geography: "Norwich · approximate area",
    score: 96,
    bucket: "hot",
    status: "buying_window_0_30",
    valueLow: 18000,
    valueHigh: 42000,
    summary: "Recent planning and registration evidence suggests a venue is moving from approval into delivery. The next few weeks are the clearest buying window.",
    buyingWindow: "0–30 days",
    likelyNeeds: ["EPOS and payments", "Connectivity", "Fit-out services"],
    signalCount: 4,
    sourceLabel: "4 corroborating signals",
    previewOnly: true,
  },
  {
    title: "Growing business preparing a larger operating base",
    eyebrow: "Growth signal",
    geography: "Cambridge · approximate area",
    score: 89,
    bucket: "strong",
    status: "buying_window_30_60",
    valueLow: 9000,
    valueHigh: 24000,
    summary: "Hiring, company change and a new premises signal point to a business likely to review suppliers as the move progresses.",
    buyingWindow: "30–60 days",
    likelyNeeds: ["IT and connectivity", "Workplace services", "Security"],
    signalCount: 3,
    sourceLabel: "3 corroborating signals",
    previewOnly: true,
  },
  {
    title: "Public contract opportunity with an active procurement window",
    eyebrow: "Procurement signal",
    geography: "East Midlands · regional",
    score: 84,
    bucket: "strong",
    status: "deadline_approaching",
    valueLow: 25000,
    valueHigh: 75000,
    summary: "A public-sector notice has moved into an actionable stage. The platform has matched the need to the supplier profile without requiring a separate market subscription.",
    buyingWindow: "Current signal",
    likelyNeeds: ["Tender response", "Delivery partner", "Contract support"],
    signalCount: 2,
    sourceLabel: "Public source layer",
    previewOnly: true,
  },
];

export function MarketplacePreview() {
  const [active, setActive] = useState(0);
  const item = PREVIEW_ITEMS[active];
  return (
    <div className="min-w-0 rounded-[2rem] border border-charcoal/10 bg-white/80 p-3 shadow-[0_24px_70px_rgba(31,41,55,0.12)] backdrop-blur sm:p-4">
      <div className="flex items-center justify-between gap-3 px-2 py-2 sm:px-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-signal-orange">Marketplace preview</p><p className="mt-1 text-xs font-medium text-slate">Same teaser logic, before you sign in</p></div>
        <div className="flex gap-1.5" aria-label="Marketplace preview slides">
          {PREVIEW_ITEMS.map((preview, index) => <button key={preview.title} type="button" onClick={() => setActive(index)} aria-label={`Show preview ${index + 1}`} className={`h-2 w-2 rounded-full transition ${index === active ? "bg-signal-orange" : "bg-charcoal/15 hover:bg-charcoal/30"}`} />)}
        </div>
      </div>
      <MarketplaceCard item={item} />
      <p className="px-2 pb-1 pt-3 text-center text-[10px] leading-4 text-slate sm:px-3">The public preview hides company identity, contact details, exact address and source evidence until the opportunity is unlocked.</p>
    </div>
  );
}
