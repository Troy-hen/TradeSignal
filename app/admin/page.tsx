import { createClient } from "@/lib/supabase/server";
import { ReprocessForm } from "@/components/admin/reprocess-form";

export default async function AdminHealthPage() {
  const supabase = await createClient();

  const [
    { data: recentIngestionRuns },
    { data: classificationRows },
    { data: recentFailedClassifications },
    { data: notificationRows },
    { data: recentStripeEvents },
  ] = await Promise.all([
    supabase.from("ingestion_runs").select("*").order("started_at", { ascending: false }).limit(5),
    supabase.from("application_classifications").select("classification_status"),
    supabase
      .from("application_classifications")
      .select("id, planning_application_id, attempts, updated_at")
      .eq("classification_status", "failed")
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase.from("notification_log").select("status"),
    supabase.from("stripe_events").select("id, type, processed_at").order("processed_at", { ascending: false }).limit(5),
  ]);

  const classificationCounts = (classificationRows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.classification_status] = (acc[row.classification_status] ?? 0) + 1;
    return acc;
  }, {});

  const notificationCounts = (notificationRows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal">System Health</h1>
      <p className="mt-2 text-slate">Internal pipeline status — not visible to customers.</p>

      <Section title="Ingestion (last 5 runs)">
        {recentIngestionRuns && recentIngestionRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-light-grey text-xs uppercase text-slate">
                  <th className="py-2 pr-4">Started</th>
                  <th className="pr-4">Type</th>
                  <th className="pr-4">Status</th>
                  <th className="pr-4">Fetched</th>
                  <th className="pr-4">Created</th>
                  <th className="pr-4">Updated</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {recentIngestionRuns.map((run) => (
                  <tr key={run.id} className="border-b border-light-grey last:border-0">
                    <td className="py-2 pr-4">{new Date(run.started_at).toLocaleString("en-GB")}</td>
                    <td className="pr-4">{run.run_type}</td>
                    <td
                      className={`pr-4 font-medium ${
                        run.status === "failed" ? "text-danger" : run.status === "partial" ? "text-warning" : "text-success"
                      }`}
                    >
                      {run.status}
                    </td>
                    <td className="pr-4">{run.applications_fetched}</td>
                    <td className="pr-4">{run.applications_created}</td>
                    <td className="pr-4">{run.applications_updated}</td>
                    <td>{run.errors_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote text="No ingestion runs recorded yet — CRON_SECRET likely isn't set on the Edge Functions yet." />
        )}
        {recentIngestionRuns?.some((run) => run.error_details) && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-charcoal">Recent provider diagnostics</p>
            {recentIngestionRuns
              .filter((run) => run.error_details)
              .slice(0, 3)
              .map((run) => (
                <pre key={run.id} className="overflow-x-auto rounded-md bg-charcoal p-3 text-xs leading-5 text-white/80">
                  {JSON.stringify(run.error_details, null, 2)}
                </pre>
              ))}
          </div>
        )}
      </Section>

      <Section title="AI classification backlog">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Pending" value={classificationCounts.pending ?? 0} />
          <Stat label="Processing" value={classificationCounts.processing ?? 0} />
          <Stat label="Stale" value={classificationCounts.stale ?? 0} />
          <Stat label="Completed" value={classificationCounts.completed ?? 0} tone="success" />
          <Stat label="Failed" value={classificationCounts.failed ?? 0} tone={classificationCounts.failed ? "danger" : undefined} />
        </div>
        {recentFailedClassifications && recentFailedClassifications.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-charcoal">Recently failed:</p>
            <ul className="space-y-2">
              {recentFailedClassifications.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-light-grey bg-white p-3 text-sm"
                >
                  <span className="text-slate">
                    {row.planning_application_id} · {row.attempts} attempt{row.attempts === 1 ? "" : "s"} · last{" "}
                    {new Date(row.updated_at).toLocaleString("en-GB")}
                  </span>
                  <ReprocessForm planningApplicationId={row.planning_application_id} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Notifications">
        <div className="grid grid-cols-3 gap-4 sm:w-1/2">
          <Stat label="Sent" value={notificationCounts.sent ?? 0} tone="success" />
          <Stat label="Queued" value={notificationCounts.queued ?? 0} />
          <Stat label="Failed" value={notificationCounts.failed ?? 0} tone={notificationCounts.failed ? "danger" : undefined} />
        </div>
      </Section>

      <Section title="Stripe webhook activity (last 5 events)">
        {recentStripeEvents && recentStripeEvents.length > 0 ? (
          <ul className="space-y-1 text-sm text-charcoal">
            {recentStripeEvents.map((e) => (
              <li key={e.id} className="flex justify-between border-b border-light-grey py-1 last:border-0">
                <span>{e.type}</span>
                <span className="text-slate">{new Date(e.processed_at).toLocaleString("en-GB")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote text="No Stripe events processed yet." />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 border-t border-light-grey pt-6 first:mt-6 first:border-0 first:pt-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-charcoal";
  return (
    <div className="rounded-md border border-light-grey bg-white p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</dd>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-light-grey p-4 text-sm text-slate">{text}</p>;
}
