import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminConversionsPage() {
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data: eventsData } = await db.from("product_events").select("event_name, source, created_at").limit(10000);
  const events = (eventsData ?? []) as Array<{ event_name: string; source: string | null; created_at: string }>;
  const count = (names: string[]) => events.filter((event) => names.includes(event.event_name)).length;
  const signups = count(["signup_completed", "account_created"]);
  const paid = count(["checkout_completed", "subscription_activated"]);
  const unlocks = count(["lead_unlocked", "opportunity_unlocked"]);
  const previewClicks = count(["prospect_teaser_clicked", "campaign_cta_clicked"]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Growth Engine · Conversions</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-charcoal">Attribution from teaser to lifetime value.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate">Keep campaign, email, prospect, teaser, signup, subscription, first unlock and subsequent revenue connected so acquisition decisions are evidence-based.</p></div><Link href="/admin/growth" className="text-sm font-semibold text-signal-orange">Back to Growth Engine →</Link></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Teaser clicks" value={previewClicks} /><Metric label="Signups" value={signups} /><Metric label="Paid conversions" value={paid} /><Metric label="First unlocks" value={unlocks} /></div>

      <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Attribution chain</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Campaign → prospect → customer → revenue</h2><div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Step number="01" title="Campaign touch" body="Campaign, message, recipient and teaser opportunity IDs." /><Step number="02" title="Intent" body="Landing-page visit, teaser click and pricing or signup CTA." /><Step number="03" title="Conversion" body="Signup, profile completion, coverage plan and first paid unlock." /><Step number="04" title="Value" body="Subscription revenue, unlock revenue, refunds and lifetime value." /></div></section>

      <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Questions the admin should answer</p><ul className="mt-5 space-y-3"><Question text="Which supplier type converts best?" /><Question text="Which geography creates the strongest customers?" /><Question text="Which teaser opportunity types drive signup?" /><Question text="How much inventory is required before conversion?" /><Question text="Which campaign creates the highest lifetime value?" /></ul></section><section className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.045] p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Current state</p><h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Event wiring is ready for internal attribution.</h2><p className="mt-3 text-sm leading-6 text-slate">Existing product events provide customer funnel visibility. Prospect-specific campaign and revenue attribution will populate once the Growth Engine schema and Resend delivery events are connected.</p><Link href="/admin/campaigns" className="mt-5 inline-flex text-sm font-semibold text-signal-orange">Review campaign structure →</Link></section></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-light-grey bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-charcoal">{new Intl.NumberFormat("en-GB").format(value)}</p></div>; }
function Step({ number, title, body }: { number: string; title: string; body: string }) { return <article className="rounded-2xl border border-light-grey bg-soft-surface p-5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal-orange/10 text-xs font-bold text-signal-orange">{number}</span><h3 className="mt-4 text-sm font-semibold text-charcoal">{title}</h3><p className="mt-2 text-xs leading-5 text-slate">{body}</p></article>; }
function Question({ text }: { text: string }) { return <li className="rounded-2xl border border-light-grey bg-soft-surface p-4 text-sm font-semibold text-charcoal">{text}</li>; }
