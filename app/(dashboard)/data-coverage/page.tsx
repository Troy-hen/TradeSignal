import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

type CoverageAuthority = {
  authority_name: string;
  authority_code: string | null;
  application_count: number;
  district_count: number;
  first_received_date: string | null;
  latest_received_date: string | null;
  latest_seen_at: string | null;
};

type CoverageSnapshot = {
  latest_ingest_at: string | null;
  latest_ingest_status: string | null;
  latest_fetched: number;
  latest_created: number;
  latest_updated: number;
  latest_errors: number;
  application_count: number;
  district_count: number;
  authority_count: number;
};

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

export default async function DataCoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as RpcClient;
  const params = await searchParams;

  const [{ data: authorityData }, { data: snapshotData }] = await Promise.all([
    db.rpc("browse_data_coverage"),
    db.rpc("browse_data_coverage_snapshot"),
  ]);

  const authorities = (Array.isArray(authorityData) ? authorityData : []) as CoverageAuthority[];
  const snapshotRow = Array.isArray(snapshotData) ? snapshotData[0] : snapshotData;
  const snapshot = normaliseSnapshot(snapshotRow);
  const pageCount = Math.max(1, Math.ceil(authorities.length / PAGE_SIZE));
  const requestedPage = Number(params.page ?? "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.min(Math.floor(requestedPage), pageCount)
    : 1;
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleAuthorities = authorities.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Data coverage</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Know what is live before you act.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate sm:text-base">
            A transparent view of the councils, postcode districts and planning dates currently loaded into MyTradeBox.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Applications loaded" value={formatNumber(snapshot.application_count)} detail="Available to matching and previews" />
        <SummaryCard label="Postcode districts" value={formatNumber(snapshot.district_count)} detail="Districts with at least one record" />
        <SummaryCard label="Councils represented" value={formatNumber(snapshot.authority_count)} detail="Authorities in the loaded feed" />
        <SummaryCard
          label="Latest ingest"
          value={snapshot.latest_ingest_at ? formatDate(snapshot.latest_ingest_at) : "Not run"}
          detail={snapshot.latest_ingest_status ? "Status: " + snapshot.latest_ingest_status : "No ingestion run recorded"}
        />
      </section>

      <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Latest run</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Freshness at a glance.</h2>
          </div>
          <p className="text-xs text-slate">
            {snapshot.latest_ingest_at ? "Completed " + formatDate(snapshot.latest_ingest_at) : "Waiting for the first successful run"}
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <RunMetric label="Fetched" value={formatNumber(snapshot.latest_fetched)} />
          <RunMetric label="Created" value={formatNumber(snapshot.latest_created)} />
          <RunMetric label="Updated" value={formatNumber(snapshot.latest_updated)} />
          <RunMetric label="Errors" value={formatNumber(snapshot.latest_errors)} />
        </div>
        <p className="mt-5 rounded-2xl bg-soft-surface px-4 py-3 text-xs leading-5 text-slate">
          Dates below reflect the public planning records loaded into MyTradeBox. A council may publish late or amend an application after its first appearance, so use the source link in an opportunity brief for the authoritative record.
        </p>
        <p className="mt-3 rounded-2xl border border-signal-orange/20 bg-signal-orange/5 px-4 py-3 text-xs leading-5 text-slate">
          Contact enrichment is not included in the current planning feed. MyTradeBox does not display applicant contact details until a compliant contact-data add-on is enabled.
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-light-grey bg-white">
        <div className="border-b border-light-grey px-5 py-5 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Council coverage</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Authorities currently represented.</h2>
        </div>
        {authorities.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-charcoal">No council records are live yet.</p>
            <p className="mt-2 text-sm leading-6 text-slate">The coverage table will populate after the next successful planning-data ingestion.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-soft-surface text-xs uppercase tracking-[0.1em] text-slate">
                <tr>
                  <th className="px-5 py-3 font-semibold sm:px-7">Council</th>
                  <th className="px-5 py-3 font-semibold">Applications</th>
                  <th className="px-5 py-3 font-semibold">Districts</th>
                  <th className="px-5 py-3 font-semibold">Received dates</th>
                  <th className="px-5 py-3 font-semibold">Latest seen</th>
                </tr>
              </thead>
              <tbody>
                {visibleAuthorities.map((authority) => (
                  <tr key={(authority.authority_code ?? "unknown") + "-" + authority.authority_name} className="border-t border-light-grey">
                    <td className="px-5 py-4 sm:px-7">
                      <p className="font-semibold text-charcoal">{authority.authority_name}</p>
                      {authority.authority_code && <p className="mt-1 text-xs text-slate">{authority.authority_code}</p>}
                    </td>
                    <td className="px-5 py-4 text-charcoal">{formatNumber(Number(authority.application_count))}</td>
                    <td className="px-5 py-4 text-charcoal">{formatNumber(Number(authority.district_count))}</td>
                    <td className="px-5 py-4 text-slate">
                      {authority.first_received_date ? formatDate(authority.first_received_date) : "—"} →{" "}
                      {authority.latest_received_date ? formatDate(authority.latest_received_date) : "—"}
                    </td>
                    <td className="px-5 py-4 text-slate">{authority.latest_seen_at ? formatDate(authority.latest_seen_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-3 border-t border-light-grey px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="text-slate">
                Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, authorities.length)} of {formatNumber(authorities.length)} councils
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={`/data-coverage?page=${currentPage - 1}`}
                    className="rounded-lg border border-light-grey px-3 py-2 font-semibold text-charcoal transition hover:border-signal-orange hover:text-signal-orange"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="rounded-lg border border-light-grey/60 px-3 py-2 font-semibold text-slate/50">Previous</span>
                )}
                <span className="px-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate">Page {currentPage} of {pageCount}</span>
                {currentPage < pageCount ? (
                  <Link
                    href={`/data-coverage?page=${currentPage + 1}`}
                    className="rounded-lg border border-light-grey px-3 py-2 font-semibold text-charcoal transition hover:border-signal-orange hover:text-signal-orange"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="rounded-lg border border-light-grey/60 px-3 py-2 font-semibold text-slate/50">Next</span>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function normaliseSnapshot(value: unknown): CoverageSnapshot {
  const row = (value ?? {}) as Partial<CoverageSnapshot>;
  return {
    latest_ingest_at: row.latest_ingest_at ?? null,
    latest_ingest_status: row.latest_ingest_status ?? null,
    latest_fetched: Number(row.latest_fetched ?? 0),
    latest_created: Number(row.latest_created ?? 0),
    latest_updated: Number(row.latest_updated ?? 0),
    latest_errors: Number(row.latest_errors ?? 0),
    application_count: Number(row.application_count ?? 0),
    district_count: Number(row.district_count ?? 0),
    authority_count: Number(row.authority_count ?? 0),
  };
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-light-grey bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate">{detail}</p>
    </div>
  );
}

function RunMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-soft-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">{label}</p>
      <p className="mt-2 text-xl font-bold text-charcoal">{value}</p>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}
