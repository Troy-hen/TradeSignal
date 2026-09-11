import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_BRAND } from "@/lib/product/brand";
import { ContactRequestForm } from "@/components/contact-request-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact TradeSignal about plans, opportunity intelligence, accounts and data requests.",
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

export default function ContactPage() {
  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Contact TradeSignal</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">Let&apos;s make your next buying window easier to act on.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Ask about Local, Regional or Nationwide reach, how your supplier profile is matched, individual lead unlocks, account access or data rights.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          <ContactCard
            title="Before you join"
            body="See the three geography plans and how the marketplace teaser shows fit, timing, likely needs and evidence before you unlock a lead."
            href="/pricing"
            label="View plans"
          />
          <ContactCard
            title="Account or billing"
            body="Signed-in customers can manage their profile, geographic reach, marketplace access, purchased leads and billing from the app."
            href="/login"
            label="Sign in"
          />
          <ContactCard
            title="Privacy and data"
            body={supportEmail ? `For a data request, email ${supportEmail} or use the request form below.` : "Use the request form below for privacy, source-data or contact-data questions."}
            href="/privacy"
            label="Read privacy notice"
          />
        </div>

        <div className="mx-auto mt-10 max-w-7xl">
          <ContactRequestForm />
        </div>

        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-light-grey bg-white p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Useful context</p>
            <h2 className="mt-2 text-xl font-semibold text-charcoal">What to include in a request</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate">
              <li>• The email address on your {PRODUCT_BRAND.name} account</li>
              <li>• Your plan or the opportunity you were reviewing</li>
              <li>• The page or action where you got stuck</li>
              <li>• A screenshot or exact error message, if you have one</li>
            </ul>
          </section>
          <section className="rounded-3xl border border-light-grey bg-white p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Direct support</p>
            <h2 className="mt-2 text-xl font-semibold text-charcoal">Need a response from the team?</h2>
            <p className="mt-3 text-sm leading-6 text-slate">
              {supportEmail ? <>Email <a className="font-semibold text-signal-orange hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> and include enough context for us to locate the account or opportunity.</> : <>Set <code className="font-semibold">NEXT_PUBLIC_SUPPORT_EMAIL</code> before launch to publish a direct support address.</>}
            </p>
            <Link href="/terms" className="mt-5 inline-flex text-sm font-semibold text-signal-orange hover:text-[#e95f00]">Read the service terms →</Link>
          </section>
        </div>
      </section>
    </div>
  );
}

function ContactCard({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return (
    <article className="flex flex-col rounded-3xl border border-light-grey bg-white p-6">
      <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate">{body}</p>
      <Link href={href} className="mt-6 inline-flex text-sm font-semibold text-signal-orange hover:text-[#e95f00]">{label} →</Link>
    </article>
  );
}
