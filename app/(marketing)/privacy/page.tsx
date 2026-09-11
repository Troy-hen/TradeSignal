import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_BRAND } from "@/lib/product/brand";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How TradeSignal handles account, profile, intelligence, contact and billing data.",
};

const updated = "11 September 2026";
const operatorName = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || PRODUCT_BRAND.name;
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
            This notice explains how <strong className="font-semibold text-charcoal">{operatorName}</strong> handles personal data when you visit {PRODUCT_BRAND.name}, create an account, set a supplier profile, browse the marketplace or unlock an opportunity.
          </p>

          <LegalSection title="1. Data we use">
            <p>Depending on how you use the service, we may process your name, business name, email, phone number, login and account-security data, free-text supplier profile, normalised capability profile, geographic plan, saved items, purchased opportunities, support messages, usage events and billing status.</p>
            <p className="mt-3">Opportunity records can include business names, company identifiers, public addresses, websites, procurement or planning references, buying-signal evidence and contact details obtained from configured business-data providers. The service is designed for B2B business information and does not intentionally build consumer lead lists.</p>
          </LegalSection>

          <LegalSection title="2. Why we use it">
            <ul className="list-disc space-y-2 pl-5">
              <li>To create accounts, secure workspaces and apply Local, Regional or Nationwide reach.</li>
              <li>To normalise supplier descriptions and match relevant buying signals across enabled sources.</li>
              <li>To show marketplace teasers, process £20 unlocks and keep purchased opportunities available.</li>
              <li>To provide contact context, support, optional CRM export and customer communications.</li>
              <li>To take payments, prevent abuse, improve reliability and meet legal and accounting obligations.</li>
            </ul>
          </LegalSection>

          <LegalSection title="3. Sources and service providers">
            <p>Intelligence can be assembled from Companies House and other public registers, procurement and planning sources, business websites, specialist data providers and information supplied by customers. The service uses infrastructure and specialist providers such as Supabase for database and authentication, Cloudflare for application delivery, Stripe for billing, Resend for transactional email and a configured AI provider for normalisation and explanation.</p>
            <p className="mt-3">The exact providers enabled for an account can change as the platform expands. They process data only as needed for the service under their own terms, privacy notices and contractual safeguards.</p>
          </LegalSection>

          <LegalSection title="4. AI processing">
            <p>Free-text supplier descriptions may be sent to the configured AI provider to extract capabilities, buyer types, locations, exclusions and matching terms. Signal and company information may be normalised into entities, events, needs, opportunities and relevance explanations. AI output is decision support and is not treated as a guarantee. We aim to minimise unnecessary personal data in AI payloads and keep source provenance with the result.</p>
          </LegalSection>

          <LegalSection title="5. Contact information and outreach">
            <p>Contact information is shown only within an unlocked opportunity when the relevant record contains it. Customers are responsible for using contact data lawfully, respecting suppression requests and following applicable UK data-protection, electronic-marketing and sector requirements. TradeSignal may record unlocks, source provenance, retrieval dates and suppression information to support auditability and data quality.</p>
          </LegalSection>

          <LegalSection title="6. Retention and security">
            <p>We retain account, billing, profile, opportunity and audit records for as long as needed to provide the service, meet legal obligations, resolve disputes and maintain a reliable intelligence history. We use access controls, row-level security, signed requests and server-side secrets to protect the system, but no online service can guarantee absolute security.</p>
          </LegalSection>

          <LegalSection title="7. Your rights">
            <p>Depending on your location and applicable law, you may have rights to access, correct, delete, restrict or object to processing, and to receive a copy of your data. Use the <Link href="/contact" className="font-semibold text-signal-orange hover:underline">contact page</Link>{supportEmail ? <> or email <a className="font-semibold text-signal-orange hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></> : " to make a request."} We may need to verify identity and account authority before responding.</p>
          </LegalSection>

          <LegalSection title="8. Cookies and changes">
            <p>The service uses essential cookies for authentication and session security. Optional analytics or marketing tools should be documented here before they are enabled. We may update this notice when the service or legal requirements change; the date at the top shows when it was last reviewed.</p>
          </LegalSection>
        </div>
      </article>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-semibold text-charcoal">{title}</h2><div className="mt-3">{children}</div></section>;
}
