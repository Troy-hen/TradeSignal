import type { Metadata } from "next";
import { FaqSection } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about Everro intelligence, the 14-day trial, geographic coverage and individual lead unlocks.",
};

export default function FaqPage() {
  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">FAQ</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">A clearer way to buy opportunity intelligence.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Start with 14 days and three included lead unlocks. Your monthly coverage fee begins after the trial, then additional opportunities are £20 each.
          </p>
        </div>
      </section>
      <FaqSection />
    </div>
  );
}
