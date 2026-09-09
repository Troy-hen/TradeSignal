import Link from "next/link";

export const FAQ_ITEMS = [
  {
    question: "What does MyTradeBox do?",
    answer:
      "MyTradeBox monitors public planning applications, matches them to your trade and turns the useful ones into a focused local opportunity feed. You see the signal, the indicative value and the recommended next move.",
  },
  {
    question: "What can I see before I claim a territory?",
    answer:
      "You can preview recent application volume, high-priority matches, estimated construction activity, indicative trade value and whether the territory is available. Specific project details stay private to the active territory holder.",
  },
  {
    question: "What is a territory?",
    answer:
      "Today, a territory is one postcode district for one trade category. That keeps the feed exclusive to that trade while allowing the same district to serve a roofer, plumber or other specialist separately. Choose only the live districts you actually serve; volume pricing reduces the unit price as your coverage grows.",
  },
  {
    question: "Are the values guaranteed?",
    answer:
      "No. Planning data can be incomplete, delayed or changed by the local authority. AI-derived scores and values are indicative estimates to help you prioritise, not valuations or promises of work.",
  },
  {
    question: "Do you sell homeowner contact details?",
    answer:
      "The product is built around public planning information and project context. Contact data is not requested from the planning provider by default. Always make sure your outreach follows applicable privacy, marketing and planning rules.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Territories are monthly subscriptions. Billing and cancellation are managed from your account, subject to the terms shown at checkout and the status of any active subscription.",
  },
  {
    question: "Can I try it without paying?",
    answer:
      "You can browse the public aggregate view without an account. Normal territory activation uses checkout; approved demo accounts can be allow-listed for testing without a Stripe payment.",
  },
] as const;

export function FaqSection({ compact = false }: { compact?: boolean }) {
  const items = compact ? FAQ_ITEMS.slice(0, 5) : FAQ_ITEMS;

  return (
    <section id="faq" className="bg-soft-surface px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Questions, answered</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
            Clear before you commit.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate">
            The short version of how the data, territories and subscriptions work.
          </p>
        </div>

        <div className="mt-9 space-y-3">
          {items.map((item) => (
            <details key={item.question} className="group rounded-2xl border border-light-grey bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 text-left text-sm font-semibold text-charcoal [&::-webkit-details-marker]:hidden sm:px-6 sm:py-5">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft-surface text-lg font-normal text-signal-orange transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="border-t border-light-grey px-5 py-4 text-sm leading-6 text-slate sm:px-6">{item.answer}</p>
            </details>
          ))}
        </div>

        {compact && (
          <Link href="/faq" className="mt-7 inline-flex text-sm font-semibold text-signal-orange hover:text-[#e95f00]">
            Read all FAQs →
          </Link>
        )}
      </div>
    </section>
  );
}
