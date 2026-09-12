import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_BRAND } from "@/lib/product/brand";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using TradeSignal opportunity intelligence and marketplace access.",
};

const updated = "11 September 2026";
const operatorName = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || PRODUCT_BRAND.name;

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
            These terms explain how you may use the {PRODUCT_BRAND.name} service. By creating an account or using the service, you agree to these terms. The service operator is <strong className="font-semibold text-charcoal">{operatorName}</strong>.
          </p>

          <LegalSection title="1. The service">
            <p>{PRODUCT_BRAND.name} combines public and commercial business signals, company information and supplier profiles to produce B2B opportunity intelligence. The marketplace presents a teaser first, including the likely need, approximate area, timing and supporting signal summary. An unlocked opportunity provides the fuller business and contact context available for that record.</p>
            <p className="mt-3">The platform is for planning and prioritising commercial outreach. It does not promise a contract, response, conversion, revenue, planning outcome or procurement award.</p>
          </LegalSection>

          <LegalSection title="2. Plans, reach and unlocks">
            <p>Customers choose one geographic plan: Local at £29.99 per month, Regional at £59.99 per month or Nationwide at £99.99 per month. Local access covers one county, selected towns or cities, or a radius of up to 25 miles. Regional access covers up to three neighbouring counties, a larger group of towns or cities, or a radius of up to 75 miles. Nationwide access covers the United Kingdom.</p>
            <p className="mt-3">Every plan uses the same intelligence engine and includes relevant opportunities identified within the selected geographic reach. Each individual opportunity unlock is charged at £20 unless the checkout page clearly shows a different price. The marketplace may apply a limit of three unlocks for the same supplier category; any applicable limit is shown before payment.</p>
          </LegalSection>

          <LegalSection title="3. Accounts and acceptable use">
            <p>You must provide accurate business information, keep login details secure and make sure anyone using the account is authorised by your business. You must not scrape the service, reverse engineer it, interfere with its operation, upload malicious content, resell access or use the data for unlawful harassment or unsolicited marketing. You remain responsible for checking that any outreach complies with applicable privacy, electronic-marketing and sector rules.</p>
          </LegalSection>

          <LegalSection title="4. Data, estimates and availability">
            <p>Records may be sourced from public registers, procurement notices, planning and property information, company data, business websites and configured specialist providers. Sources can be delayed, incomplete, amended, withdrawn or inconsistent. AI normalisation, relevance scores, buying windows, indicative values and suggested needs are decision-support estimates, not facts or guarantees.</p>
            <p className="mt-3">We aim to keep data fresh and the service available, but do not promise that every business, signal, location or contact detail will be present or error-free.</p>
          </LegalSection>

          <LegalSection title="5. Billing and cancellation">
            <p>Monthly plan fees and individual unlock prices are shown before checkout and billed through the payment provider shown there. Your account is responsible for charges made by authorised users. A completed unlock is added to Purchased leads and remains available in the account while the relevant service records are retained. Cancellation and any refund rights follow the checkout terms and applicable consumer or business law.</p>
          </LegalSection>

          <LegalSection title="6. Intellectual property">
            <p>The {PRODUCT_BRAND.name} software, interface, branding, scoring logic and original content belong to the service operator or its licensors. You retain rights in the business information you submit. You may use purchased opportunity information internally for legitimate business development, subject to these terms and applicable law.</p>
          </LegalSection>

          <LegalSection title="7. Suspension and termination">
            <p>We may suspend or close an account where necessary to protect the service, other customers or third-party rights, or where these terms are breached. You may stop using the service at any time. Charges already incurred and provisions that should reasonably survive termination continue to apply.</p>
          </LegalSection>

          <LegalSection title="8. Liability">
            <p>To the extent permitted by law, the operator is not responsible for indirect loss, lost profit, lost opportunity or decisions made solely from an estimate, public record or contact-data result. Nothing in these terms limits liability that cannot legally be limited, including liability for fraud or death or personal injury caused by negligence.</p>
          </LegalSection>

          <LegalSection title="9. Contact">
            <p>For questions about these terms, use the <Link href="/contact" className="font-semibold text-signal-orange hover:underline">contact page</Link>. The legal entity and support details shown at launch should match the registered business and the contracting entity.</p>
          </LegalSection>
        </div>
      </article>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-semibold text-charcoal">{title}</h2><div className="mt-3">{children}</div></section>;
}
