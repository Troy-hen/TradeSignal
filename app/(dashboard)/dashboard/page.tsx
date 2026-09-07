import { requireCurrentCompany } from "@/lib/auth/get-current-company";

export default async function DashboardPage() {
  const company = await requireCurrentCompany();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal">Welcome, {company.trading_name}</h1>
      <p className="mt-2 text-slate">
        Your opportunity dashboard is being built out next — check the Territory Explorer to
        browse what&apos;s available in your area.
      </p>
    </div>
  );
}
