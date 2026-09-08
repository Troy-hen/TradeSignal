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
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-charcoal">Billing</h1>
      <p className="mt-2 text-slate">
        Manage payment details, view invoices, and cancel a territory from the Stripe billing portal.
      </p>

      <div className="mt-6">
        <BillingPortalButton />
      </div>

      {subscriptions && subscriptions.length > 0 && (
        <ul className="mt-8 space-y-3">
          {subscriptions.map((sub) => (
            <li key={sub.id} className="rounded-md border border-light-grey bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-charcoal">{STATUS_LABELS[sub.status] ?? sub.status}</span>
                {sub.cancel_at_period_end && <span className="text-xs text-warning">Cancels at period end</span>}
              </div>
              {sub.current_period_end && (
                <p className="mt-1 text-sm text-slate">Renews {new Date(sub.current_period_end).toLocaleDateString("en-GB")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
