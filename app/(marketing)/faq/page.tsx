import type { Metadata } from "next";
import { FaqSection } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about MyTradeBox data, territories, pricing and subscriptions.",
};

export default function FaqPage() {
  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-4xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">FAQ</p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">Everything you need to know before you claim.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            A practical guide to the data, territory exclusivity, estimates and monthly billing.
          </p>
        </div>
      </section>
      <FaqSection />
    </div>
  );
}
