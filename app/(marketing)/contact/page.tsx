import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TerritoryCheckerWidget } from "@/components/territory-checker-widget";
import { ContactRequestForm } from "@/components/contact-request-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact MyTradeBox about territories, accounts and support.",
};

export default async function ContactPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const supabase = await createClient();
  const { data: trades } = await supabase
    .from("trade_categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("display_order");

  return (
    <div className="bg-soft-surface">
      <section className="bg-charcoal px-6 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl lg:px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Contact</p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">Let&apos;s make your local pipeline more useful.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Ask about territory coverage, account access, billing or how MyTradeBox can fit the way your team wins work.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          <ContactCard
            title="Territory questions"
            body="Check a postcode district and see the live aggregate signal, price and availability before you create an account."
            href="#availability-checker"
            label="Check availability"
          />
          <ContactCard
            title="Account or billing"
            body="Signed-in customers can manage their workspace, territories and billing from the app."
            href="/login"
            label="Sign in"
          />
          <ContactCard
            title="General support"
            body={
              supportEmail
                ? "Send us a message and include the postcode district or account email we should look at."
                : "The support inbox is being configured. For now, check availability or sign in to continue."
            }
            href={supportEmail ? "mailto:" + supportEmail : "/signup"}
            label={supportEmail ? supportEmail : "Create an account"}
          />
        </div>

        <div id="availability-checker" className="mx-auto mt-10 max-w-7xl scroll-mt-8 rounded-3xl border border-light-grey bg-white p-7 sm:p-9">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Live territory check</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Search your postcode district.</h2>
            <p className="mt-2 text-sm leading-6 text-slate">Choose a trade and preview current planning activity, estimated value and territory availability without creating an account.</p>
          </div>
          <div className="mt-6">
            <TerritoryCheckerWidget trades={trades ?? []} compact />
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl">
          <ContactRequestForm />
        </div>

        <div className="mx-auto mt-10 max-w-7xl rounded-3xl border border-light-grey bg-white p-7 sm:p-9">
          <h2 className="text-xl font-semibold text-charcoal">What to include in a support request</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate sm:grid-cols-2">
            <li>• The email address on your MyTradeBox account</li>
            <li>• The postcode district and trade category</li>
            <li>• The page or action where you got stuck</li>
            <li>• A screenshot or exact error message, if you have one</li>
          </ul>
          {!supportEmail && (
            <p className="mt-6 rounded-2xl bg-warning/10 px-4 py-3 text-sm leading-6 text-warning">
              Before launch, set <code className="font-semibold">NEXT_PUBLIC_SUPPORT_EMAIL</code> so this page can offer a direct support address.
            </p>
          )}
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
      <Link href={href} className="mt-6 inline-flex text-sm font-semibold text-signal-orange hover:text-[#e95f00]">
        {label} →
      </Link>
    </article>
  );
}
