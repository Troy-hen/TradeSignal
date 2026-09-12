import Link from "next/link";

/** Compatibility wrapper for older detail routes. Plan selection happens in
 * Coverage and lead unlocks are handled per opportunity from the marketplace. */
export function ClaimTerritoryButton({ postcodeDistrict }: { postcodeDistrict: string; tradeCategoryId?: string; priceLabel?: string }) {
  return <div className="rounded-2xl bg-charcoal p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-signal-orange">Choose your coverage</p><p className="mt-2 text-sm leading-6 text-white/65">{postcodeDistrict} is a preview area. Choose Local, Regional or Nationwide coverage, then unlock individual opportunities from the marketplace.</p></div><Link href="/coverage" className="mt-4 inline-flex shrink-0 items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] sm:mt-0">Open coverage →</Link></div>;
}
