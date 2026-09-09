import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How MyTradeBox handles account, billing and planning data.",
};

const updated = "8 September 2026";
const operatorName = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || "MyTradeBox";
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

export default function PrivacyPage() {
  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Legal</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Privacy notice</h1>
          <p className="mt-4 text-sm text-white/60">Last updated {updated}</p>
        </div>
      </section>

      <article className="mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-2">
        <div className="space-y-9 text-sm leading-7 text-slate">
          <p>
            This notice explains how <strong className="font-semibold text-charcoal">{operatorName}</strong> handles personal data when you visit MyTradeBox, create an account or use a territory.
          </p>

          <LegalSection title="1. Data we use">
            <p>Depending on how you use the service, we may process your name, business name, billing email, phone number, login and account security data, territory choices, support messages, usage events and billing status. Planning records may include public addresses, application references, descriptions, dates and information published by a planning authority.</p>
          </LegalSection>

          <LegalSection title="2. Why we use it">
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and secure accounts, workspaces and territory access.</li>
              <li>To provide planning search, matching, scoring, alerts and customer support.</li>
              <li>To take payments, manage subscriptions and prevent fraud.</li>
              <li>To monitor reliability, protect the service and improve the product.</li>
              <li>To meet legal, accounting and record-keeping obligations.</li>
            </ul>
          </LegalSection>

          <LegalSection title="3. Service providers">
            <p>MyTradeBox uses infrastructure and specialist providers to operate the service, including Supabase for database and authentication, Cloudflare for application delivery, Stripe for billing, Resend for transactional email, and OpenAI or another configured AI provider for classification and enrichment. Planning information is obtained from the configured planning-data provider.</p>
            <p className="mt-3">Providers process data only as needed for the service, under their own terms and privacy notices. The final launch version should record the exact legal entities, regions and processor agreements for the selected plan.</p>
          </LegalSection>

          <LegalSection title="4. AI processing">
            <p>Planning text and structured application fields may be sent to the configured AI provider to classify an application for trade relevance and produce an indicative opportunity estimate. Optional contact enrichment is separately gated, quota-limited and recorded with source provenance, purpose, lawful basis, retrieval date, expiry and suppression controls. The service is designed to minimise personal data in AI payloads, and AI output is reviewed as decision support rather than treated as fact.</p>
          </LegalSection>

          <LegalSection title="5. Retention and security">
            <p>We retain account, billing and service records for as long as needed to provide the service, meet legal obligations, resolve disputes and maintain audit trails. We use access controls, row-level security, signed requests and server-side secrets to protect the system, but no online service can guarantee absolute security.</p>
          </LegalSection>

          <LegalSection title="6. Your rights">
            <p>Depending on your location and the applicable law, you may have rights to access, correct, delete, restrict or object to processing, and to receive a copy of your data. You can request help through the <Link href="/contact" className="font-semibold text-signal-orange hover:underline">contact page</Link>. {supportEmail ? "You can also email " + supportEmail + "." : "A direct privacy-request email address must be configured before launch."}</p>
          </LegalSection>

          <LegalSection title="7. Cookies and similar technology">
            <p>The service uses essential cookies for authentication and session security. We do not need advertising cookies to provide the core territory and opportunity workflow. Any optional analytics or marketing tools should be documented here before they are enabled.</p>
          </LegalSection>

          <LegalSection title="8. Changes">
            <p>We may update this notice when the service or legal requirements change. The date at the top shows when it was last reviewed.</p>
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
