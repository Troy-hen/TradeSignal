import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { getVendorCapabilities } from "@/lib/vendors/readiness";

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

type FeedCoverage = {
  source_key: string;
  source_label: string;
  source_kind: "planning" | "public_procurement" | string;
  record_count: number;
  tender_count: number;
  pipeline_count: number;
  award_count: number;
  commercial_count: number;
  latest_record_at: string | null;
};

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

export default async function DataCoveragePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireCurrentCompany();
  const supabase = await createClient();
  const db = supabase as unknown as RpcClient;
  const params = await searchParams;
  const capabilities = getVendorCapabilities();

  const [{ data: authorityData }, { data: snapshotData }, { data: feedData }] = await Promise.all([
    db.rpc("browse_data_coverage"),
    db.rpc("browse_data_coverage_snapshot"),
    db.rpc("browse_intelligence_feed_coverage"),
  ]);

  const authorities = (Array.isArray(authorityData) ? authorityData : []) as CoverageAuthority[];
  const snapshotRow = Array.isArray(snapshotData) ? snapshotData[0] : snapshotData;
  const snapshot = normaliseSnapshot(snapshotRow);
  const feeds = (Array.isArray(feedData) ? feedData : []).map(normaliseFeed);
  const totalSourceRecords = feeds.reduce((sum, feed) => sum + feed.record_count, 0);
  const liveFeeds = feeds.filter((feed) => feed.record_count > 0).length;
  const latestAcrossFeeds = latestDate(feeds.map((feed) => feed.latest_record_at));

  const pageCount = Math.max(1, Math.ceil(authorities.length / PAGE_SIZE));
  const requestedPage = Number(params.page ?? "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(Math.floor(requestedPage), pageCount) : 1;
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleAuthorities = authorities.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-orange">Data coverage</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Know what MyTradeBox can see.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate sm:text-base">
          Coverage now includes planning applications, commercial planning, public-sector pipeline, live tenders and contract awards. Enrichment services are shown separately because they are queried on demand rather than pre-loaded as opportunity feeds.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Source records" value={formatNumber(totalSourceRecords)} detail="Active records across the live opportunity feeds" />
        <SummaryCard label="Postcode districts" value={formatNumber(snapshot.district_count)} detail="Planning districts currently represented" />
        <SummaryCard label="Councils represented" value={formatNumber(snapshot.authority_count)} detail="Planning authorities in the loaded feed" />
        <SummaryCard label="Live feed families" value={formatNumber(liveFeeds)} detail={latestAcrossFeeds ? `Latest source activity ${formatDate(latestAcrossFeeds)}` : "Waiting for source activity"} />
      </section>

      <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Opportunity feeds</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">What is flowing into the intelligence layer.</h2>
          </div>
          <p className="text-xs text-slate">Counts are current stored records, not the total size of each national source.</p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {feeds.map((feed) => <FeedCard key={feed.source_key} feed={feed} />)}
        </div>

        <div className="mt-5 rounded-2xl bg-soft-surface px-4 py-3 text-xs leading-5 text-slate">
          Planning and procurement sources have different geographic precision. Exact postcodes can be mapped to a territory; regional tender notices remain regional rather than being falsely pinned to a buyer&apos;s office address.
        </div>
      </section>

      <section className="rounded-3xl border border-signal-orange/20 bg-signal-orange/[0.03] p-5 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">On-demand enrichment</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Extra context when a project needs deeper qualification.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">These services do not behave like continuous feeds. MyTradeBox calls them against an individual opportunity, company or project when relevant.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <EnrichmentCard
            title="Energy Performance"
            status={capabilities.energyIntelligence ? "Ready" : "Not configured"}
            ready={capabilities.energyIntelligence}
            body="Official domestic and non-domestic EPC data for England and Wales, matched by project address and UPRN where available."
          />
          <EnrichmentCard
            title="Companies House"
            status={capabilities.companiesHouse ? "Ready" : "Not configured"}
            ready={capabilities.companiesHouse}
            body="Company status, officers, filing context, charges and insolvency signals for business-led opportunities."
          />
          <EnrichmentCard
            title="Planning contacts"
            status={capabilities.planningContactData ? "Ready" : "Not enabled"}
            ready={capabilities.planningContactData}
            body="Published professional planning contacts can be checked on demand when the source/provider supports them."
          />
          <EnrichmentCard
            title="AI intelligence"
            status={capabilities.ai ? "Ready" : "Not configured"}
            ready={capabilities.ai}
            body="Classification, trade relevance, summaries and deeper research used to turn raw source records into actionable work."
          />
        </div>
      </section>

      <section className="rounded-3xl border border-light-grey bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Planning freshness</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Latest planning ingestion run.</h2>
          </div>
          <p className="text-xs text-slate">{snapshot.latest_ingest_at ? `Completed ${formatDate(snapshot.latest_ingest_at)}` : "Waiting for the first successful run"}</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <RunMetric label="Fetched" value={formatNumber(snapshot.latest_fetched)} />
          <RunMetric label="Created" value={formatNumber(snapshot.latest_created)} />
          <RunMetric label="Updated" value={formatNumber(snapshot.latest_updated)} />
          <RunMetric label="Errors" value={formatNumber(snapshot.latest_errors)} />
        </div>
        <p className="mt-5 rounded-2xl bg-soft-surface px-4 py-3 text-xs leading-5 text-slate">
          Planning dates reflect the records currently loaded into MyTradeBox. Councils can publish late or amend an application after its first appearance, so the source link in each opportunity remains the authoritative record.
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-light-grey bg-white">
        <div className="border-b border-light-grey px-5 py-5 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Planning geography</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Councils currently represented.</h2>
          <p className="mt-2 text-sm text-slate">This table is intentionally planning-specific; tender and award coverage is shown by source above because many procurement notices use regional delivery areas rather than council boundaries.</p>
        </div>
        {authorities.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-charcoal">No council records are live yet.</p>
            <p className="mt-2 text-sm leading-6 text-slate">The coverage table will populate after a successful planning-data ingestion.</p>
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
                  <tr key={`${authority.authority_code ?? "unknown"}-${authority.authority_name}`} className="border-t border-light-grey">
                    <td className="px-5 py-4 sm:px-7"><p className="font-semibold text-charcoal">{authority.authority_name}</p>{authority.authority_code && <p className="mt-1 text-xs text-slate">{authority.authority_code}</p>}</td>
                    <td className="px-5 py-4 text-charcoal">{formatNumber(Number(authority.application_count))}</td>
                    <td className="px-5 py-4 text-charcoal">{formatNumber(Number(authority.district_count))}</td>
                    <td className="px-5 py-4 text-slate">{authority.first_received_date ? formatDate(authority.first_received_date) : "—"} → {authority.latest_received_date ? formatDate(authority.latest_received_date) : "—"}</td>
                    <td className="px-5 py-4 text-slate">{authority.latest_seen_at ? formatDate(authority.latest_seen_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-3 border-t border-light-grey px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="text-slate">Showing {authorities.length ? pageStart + 1 : 0}–{Math.min(pageStart + PAGE_SIZE, authorities.length)} of {formatNumber(authorities.length)} councils</p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? <Link href={`/data-coverage?page=${currentPage - 1}`} className="rounded-lg border border-light-grey px-3 py-2 font-semibold text-charcoal transition hover:border-signal-orange hover:text-signal-orange">Previous</Link> : <span className="rounded-lg border border-light-grey/60 px-3 py-2 font-semibold text-slate/50">Previous</span>}
                <span className="px-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate">Page {currentPage} of {pageCount}</span>
                {currentPage < pageCount ? <Link href={`/data-coverage?page=${currentPage + 1}`} className="rounded-lg border border-light-grey px-3 py-2 font-semibold text-charcoal transition hover:border-signal-orange hover:text-signal-orange">Next</Link> : <span className="rounded-lg border border-light-grey/60 px-3 py-2 font-semibold text-slate/50">Next</span>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function FeedCard({ feed }: { feed: FeedCoverage }) {
  const parts = feed.source_kind === "planning"
    ? [`${formatNumber(feed.commercial_count)} commercial`]
    : [
        feed.tender_count > 0 ? `${formatNumber(feed.tender_count)} tenders` : null,
        feed.pipeline_count > 0 ? `${formatNumber(feed.pipeline_count)} pipeline` : null,
        feed.award_count > 0 ? `${formatNumber(feed.award_count)} awards` : null,
        feed.commercial_count > 0 ? `${formatNumber(feed.commercial_count)} commercial` : null,
      ].filter((item): item is string => Boolean(item));
  return (
    <article className="rounded-2xl border border-light-grey bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">{feed.source_kind === "planning" ? "Planning feed" : "Public procurement"}</p><h3 className="mt-2 text-lg font-bold text-charcoal">{feed.source_label}</h3></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${feed.record_count > 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{feed.record_count > 0 ? "Live" : "No records"}</span>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight text-charcoal">{formatNumber(feed.record_count)}</p>
      <p className="mt-1 text-xs text-slate">active source records</p>
      {parts.length > 0 && <p className="mt-4 text-xs font-semibold text-charcoal">{parts.join(" · ")}</p>}
      <p className="mt-2 text-xs text-slate">{feed.latest_record_at ? `Latest ${formatDate(feed.latest_record_at)}` : "No source activity recorded"}</p>
    </article>
  );
}

function EnrichmentCard({ title, status, ready, body }: { title: string; status: string; ready: boolean; body: string }) {
  return <article className="rounded-2xl border border-signal-orange/10 bg-white p-4"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-bold text-charcoal">{title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${ready ? "bg-success/10 text-success" : "bg-soft-surface text-slate"}`}>{status}</span></div><p className="mt-3 text-xs leading-5 text-slate">{body}</p></article>;
}

function normaliseSnapshot(value: unknown): CoverageSnapshot {
  const row = (value ?? {}) as Partial<CoverageSnapshot>;
  return {
    latest_ingest_at: row.latest_ingest_at ?? null,
    latest_ingest_status: row.latest_ingest_status ?? null,
    latest_fetched: Number(row.latest_fetched ?? 0), latest_created: Number(row.latest_created ?? 0), latest_updated: Number(row.latest_updated ?? 0), latest_errors: Number(row.latest_errors ?? 0),
    application_count: Number(row.application_count ?? 0), district_count: Number(row.district_count ?? 0), authority_count: Number(row.authority_count ?? 0),
  };
}

function normaliseFeed(value: unknown): FeedCoverage {
  const row = (value ?? {}) as Partial<FeedCoverage>;
  return {
    source_key: String(row.source_key ?? "unknown"), source_label: String(row.source_label ?? "Unknown source"), source_kind: String(row.source_kind ?? "unknown"),
    record_count: Number(row.record_count ?? 0), tender_count: Number(row.tender_count ?? 0), pipeline_count: Number(row.pipeline_count ?? 0), award_count: Number(row.award_count ?? 0), commercial_count: Number(row.commercial_count ?? 0), latest_record_at: row.latest_record_at ?? null,
  };
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-light-grey bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-charcoal">{value}</p><p className="mt-1 text-xs leading-5 text-slate">{detail}</p></div>; }
function RunMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-soft-surface p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">{label}</p><p className="mt-2 text-xl font-bold text-charcoal">{value}</p></div>; }
function formatNumber(value: number): string { return new Intl.NumberFormat("en-GB").format(value); }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)); }
function latestDate(values: Array<string | null>) { const valid = values.filter((value): value is string => Boolean(value)); if (!valid.length) return null; return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0]; }
