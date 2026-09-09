import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using MyTradeBox.",
};

const updated = "8 September 2026";
const operatorName = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || "MyTradeBox";

export default function TermsPage() {
  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Legal</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Terms of service</h1>
          <p className="mt-4 text-sm text-white/60">Last updated {updated}</p>
        </div>
      </section>

      <article className="mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-2">
        <div className="space-y-9 text-sm leading-7 text-slate">
          <p>
            These terms explain how you may use the MyTradeBox service. By creating an account or using the service, you agree to these terms. The service operator is <strong className="font-semibold text-charcoal">{operatorName}</strong>.
          </p>

          <LegalSection title="1. The service">
            <p>MyTradeBox provides planning-application intelligence for trade businesses. It collects and organises public planning information, matches applications to trade categories and presents scores, estimates and suggested actions.</p>
            <p className="mt-3">A territory currently means one trade category in one postcode district. Where a territory is active, the service is intended to make that trade-specific opportunity feed exclusive to the subscribing business for the period shown in the account.</p>
          </LegalSection>

          <LegalSection title="2. Accounts and acceptable use">
            <p>You must provide accurate business and account information, keep your login details secure and ensure that people using your account are authorised by your business. You must not scrape the service, reverse engineer it, interfere with its operation, upload malicious content or use planning data for unlawful harassment or unsolicited marketing.</p>
          </LegalSection>

          <LegalSection title="3. Data, estimates and availability">
            <p>Planning applications are sourced from third-party planning data and public authority records. Records may be delayed, incomplete, amended or withdrawn. AI classifications, opportunity scores and project values are indicative decision-support estimates, not valuations, guarantees of a planning outcome or promises of work.</p>
            <p className="mt-3">We aim to keep the service available and data fresh, but do not promise that every application, postcode district or trade category will always be available or error-free.</p>
          </LegalSection>

          <LegalSection title="4. Territories and billing">
            <p>Territory pricing is shown before activation. The starting price is the same across trades; volume pricing reduces the unit price as you add districts, and verified county bundles may receive a discount. Monthly subscriptions are billed through the payment method and provider shown at checkout. Your account is responsible for charges incurred by authorised users. Cancellation takes effect according to the billing status and terms shown in your account.</p>
            <p className="mt-3">A territory does not guarantee a number of leads, enquiries, conversions, revenue or exclusivity outside the specific trade and geographic unit stated in your account.</p>
          </LegalSection>

          <LegalSection title="5. Intellectual property">
            <p>MyTradeBox and its software, interface, branding, scoring logic and original content belong to the service operator or its licensors. You retain rights in the business information you submit. You may use the service output internally to find and qualify work, subject to these terms and applicable law.</p>
          </LegalSection>

          <LegalSection title="6. Suspension and termination">
            <p>We may suspend or close an account where it is necessary to protect the service, other customers or third-party rights, or where these terms are breached. You may stop using the service at any time; outstanding charges and provisions that should reasonably survive termination continue to apply.</p>
          </LegalSection>

          <LegalSection title="7. Liability">
            <p>To the extent permitted by law, MyTradeBox is not responsible for indirect loss, lost profit, lost opportunity or decisions made solely from an estimate or planning record. Nothing in these terms limits liability that cannot legally be limited, including liability for fraud or death or personal injury caused by negligence.</p>
          </LegalSection>

          <LegalSection title="8. Contact">
            <p>For questions about these terms, use the <Link href="/contact" className="font-semibold text-signal-orange hover:underline">contact page</Link>. The operator and support details should be completed with the registered business information before launch.</p>
          </LegalSection>
        </div>
      </article>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
