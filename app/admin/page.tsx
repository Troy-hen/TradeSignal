import { createAdminClient } from "@/lib/supabase/admin";

type CompanyRow = {
  id: string;
  trading_name: string;
  billing_email: string;
  verified: boolean;
  created_at: string;
  deleted_at: string | null;
};

type MembershipRow = {
  company_id: string;
  status: string;
  created_at: string;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type TerritoryRow = {
  id: string;
  postcode_district: string;
  trade_category_id: string;
  monthly_price_pence: number;
  currency: string;
  is_active: boolean;
};

type ClaimRow = {
  id: string;
  territory_id: string;
  company_id: string;
  status: string;
  activated_at: string | null;
  created_at: string;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
};

type ClassificationRow = {
  classification_status: string;
};

type NotificationRow = {
  status: string;
};

const PURCHASED_STATUSES = new Set(["active", "suspended"]);

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: companiesData },
    { data: membershipsData },
    { data: categoriesData },
    { data: territoriesData },
    { data: claimsData },
    { data: classificationData },
    { data: notificationData },
    { count: applicationCount },
    { count: newApplicationCount },
    { count: activeOpportunityCount },
    { count: leadMatchCount },
    { count: recentLeadMatchCount },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id, trading_name, billing_email, verified, created_at, deleted_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("company_memberships").select("company_id, status, created_at"),
    supabase.from("trade_categories").select("id, name, slug"),
    supabase
      .from("territories")
      .select("id, postcode_district, trade_category_id, monthly_price_pence, currency, is_active"),
    supabase
      .from("territory_claims")
      .select("id, territory_id, company_id, status, activated_at, created_at, stripe_subscription_id, stripe_checkout_session_id")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("application_classifications").select("classification_status"),
    supabase.from("notification_log").select("status"),
    supabase.from("planning_applications").select("id", { count: "exact", head: true }),
    supabase
      .from("planning_applications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("application_trade_opportunities")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("lead_matches").select("id", { count: "exact", head: true }),
    supabase
      .from("lead_matches")
      .select("id", { count: "exact", head: true })
      .gte("matched_at", thirtyDaysAgo),
  ]);

  const companies = (companiesData ?? []) as CompanyRow[];
  const memberships = (membershipsData ?? []) as MembershipRow[];
  const categories = (categoriesData ?? []) as CategoryRow[];
  const territories = (territoriesData ?? []) as TerritoryRow[];
  const claims = (claimsData ?? []) as ClaimRow[];
  const classifications = (classificationData ?? []) as ClassificationRow[];
  const notifications = (notificationData ?? []) as NotificationRow[];

  const companyById = new Map(companies.map((company) => [company.id, company]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const territoryById = new Map(territories.map((territory) => [territory.id, territory]));
  const membershipCountByCompany = memberships.reduce<Record<string, number>>((counts, membership) => {
    if (membership.status === "active") {
      counts[membership.company_id] = (counts[membership.company_id] ?? 0) + 1;
    }
    return counts;
  }, {});

  const purchasedClaims = claims.filter((claim) => PURCHASED_STATUSES.has(claim.status));
  const activeClaims = claims.filter((claim) => claim.status === "active");
  const mrrPence = activeClaims.reduce(
    (total, claim) => total + (territoryById.get(claim.territory_id)?.monthly_price_pence ?? 0),
    0,
  );

  const claimsByCompany = purchasedClaims.reduce<Record<string, number>>((counts, claim) => {
    counts[claim.company_id] = (counts[claim.company_id] ?? 0) + 1;
    return counts;
  }, {});

  const classificationCounts = classifications.reduce<Record<string, number>>((counts, row) => {
    counts[row.classification_status] = (counts[row.classification_status] ?? 0) + 1;
    return counts;
  }, {});

  const notificationCounts = notifications.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});

  const visibleCompanies = companies.filter((company) => !company.deleted_at);
  const currency = "GBP";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Platform overview</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-charcoal">Customers, territories and growth.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">
            A compact view of the commercial surface. Pipeline operations stay in Supabase logs and Edge Function monitoring.
          </p>
        </div>
        <p className="text-xs text-slate">Updated {formatDate(new Date().toISOString())}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Customers" value={formatNumber(visibleCompanies.length)} note="Active companies" />
        <StatCard label="Territories" value={formatNumber(activeClaims.length)} note="Active now" />
        <StatCard label="MRR" value={formatMoney(mrrPence, currency)} note="Active claims" />
        <StatCard label="Applications" value={formatNumber(applicationCount ?? 0)} note={formatNumber(newApplicationCount ?? 0) + " in 30 days"} />
        <StatCard label="Opportunities" value={formatNumber(activeOpportunityCount ?? 0)} note="Active matches" />
        <StatCard label="Lead matches" value={formatNumber(leadMatchCount ?? 0)} note={formatNumber(recentLeadMatchCount ?? 0) + " in 30 days"} />
      </div>

      <Section title="Customers" eyebrow="Accounts">
        {visibleCompanies.length === 0 ? (
          <EmptyNote text="No customer companies yet." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-light-grey bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-soft-surface text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-4 py-3 font-semibold">Business</th>
                  <th className="px-4 py-3 font-semibold">Billing email</th>
                  <th className="px-4 py-3 font-semibold">Team</th>
                  <th className="px-4 py-3 font-semibold">Territories</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleCompanies.map((company) => (
                  <tr key={company.id} className="border-t border-light-grey">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-charcoal">{company.trading_name}</p>
                      <p className="mt-1 text-xs text-slate">{company.verified ? "Verified business" : "Unverified"}</p>
                    </td>
                    <td className="px-4 py-4 text-slate">{company.billing_email}</td>
                    <td className="px-4 py-4 text-charcoal">{membershipCountByCompany[company.id] ?? 0}</td>
                    <td className="px-4 py-4 text-charcoal">{claimsByCompany[company.id] ?? 0}</td>
                    <td className="px-4 py-4 text-slate">{formatDate(company.created_at)}</td>
                    <td className="px-4 py-4"><StatusPill label="Active" tone="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Purchased territories" eyebrow="Coverage">
        {purchasedClaims.length === 0 ? (
          <EmptyNote text="No purchased territories yet." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-light-grey bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-soft-surface text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-4 py-3 font-semibold">Area</th>
                  <th className="px-4 py-3 font-semibold">Trade</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Monthly</th>
                  <th className="px-4 py-3 font-semibold">Access</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Activated</th>
                </tr>
              </thead>
              <tbody>
                {purchasedClaims.map((claim) => {
                  const territory = territoryById.get(claim.territory_id);
                  const category = territory ? categoryById.get(territory.trade_category_id) : undefined;
                  const company = companyById.get(claim.company_id);
                  const isPaid = Boolean(claim.stripe_subscription_id || claim.stripe_checkout_session_id);

                  return (
                    <tr key={claim.id} className="border-t border-light-grey">
                      <td className="px-4 py-4 font-semibold text-charcoal">{territory?.postcode_district ?? "—"}</td>
                      <td className="px-4 py-4 text-charcoal">{category?.name ?? "—"}</td>
                      <td className="px-4 py-4 text-slate">{company?.trading_name ?? "Unknown company"}</td>
                      <td className="px-4 py-4 font-semibold text-charcoal">
                        {formatMoney(territory?.monthly_price_pence ?? 0, territory?.currency ?? "GBP")}/mo
                      </td>
                      <td className="px-4 py-4"><StatusPill label={isPaid ? "Paid" : "Demo"} tone={isPaid ? "success" : "warning"} /></td>
                      <td className="px-4 py-4"><StatusPill label={claim.status} tone={claim.status === "active" ? "success" : "warning"} /></td>
                      <td className="px-4 py-4 text-slate">{formatDate(claim.activated_at ?? claim.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="General analytics" eyebrow="Product activity">
        <div className="grid gap-4 lg:grid-cols-3">
          <AnalyticsCard
            title="Classification"
            rows={[
              ["Completed", classificationCounts.completed ?? 0],
              ["Pending / stale", (classificationCounts.pending ?? 0) + (classificationCounts.stale ?? 0)],
              ["Failed", classificationCounts.failed ?? 0],
            ]}
          />
          <AnalyticsCard
            title="Notifications"
            rows={[
              ["Sent", notificationCounts.sent ?? 0],
              ["Queued", notificationCounts.queued ?? 0],
              ["Failed", notificationCounts.failed ?? 0],
            ]}
          />
          <AnalyticsCard
            title="Coverage"
            rows={[
              ["Available territory records", territories.filter((territory) => territory.is_active).length],
              ["Purchased territories", purchasedClaims.length],
              ["Paid subscriptions", purchasedClaims.filter((claim) => Boolean(claim.stripe_subscription_id)).length],
            ]}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">{title}</h2>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-light-grey bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-slate">{note}</p>
    </div>
  );
}

function AnalyticsCard({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div className="rounded-2xl border border-light-grey bg-white p-5">
      <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
      <dl className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-slate">{label}</dt>
            <dd className="font-semibold text-charcoal">{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "success" | "warning" | "neutral" }) {
  const classes =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-soft-surface text-slate";

  return <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize " + classes}>{label}</span>;
}

function EmptyNote({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-light-grey bg-white p-5 text-sm text-slate">{text}</p>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatMoney(pence: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
