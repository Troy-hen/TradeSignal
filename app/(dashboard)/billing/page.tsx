import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { BillingPortalButton } from "@/components/billing-portal-button";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
};

export default async function BillingPage() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, cancel_at_period_end")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Account</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Billing.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
          Manage your MyTradeBox subscription, payment details and invoices in the secure billing portal.
        </p>
      </div>

      <section className="rounded-3xl bg-charcoal p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Manage subscription</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Keep your territories working for you.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
              Update your payment method, view invoices or manage territory subscriptions without leaving the secure Stripe portal.
            </p>
          </div>
          <BillingPortalButton />
        </div>
      </section>

      {subscriptions && subscriptions.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Subscription history</p>
          <ul className="mt-4 space-y-3">
            {subscriptions.map((sub) => (
              <li key={sub.id} className="rounded-2xl border border-light-grey bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${sub.status === "active" || sub.status === "trialing" ? "bg-success" : "bg-warning"}`} />
                    <span className="font-semibold text-charcoal">{STATUS_LABELS[sub.status] ?? sub.status}</span>
                  </div>
                  {sub.cancel_at_period_end && <span className="rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">Cancels at period end</span>}
                </div>
                {sub.current_period_end && (
                  <p className="mt-2 text-sm text-slate">Renews {new Date(sub.current_period_end).toLocaleDateString("en-GB")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-light-grey bg-white p-6 text-sm text-slate">
          No active subscription yet. Claim a territory to start your MyTradeBox plan.
        </div>
      )}
    </div>
  );
}
