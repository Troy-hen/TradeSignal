import type { OpportunityQuoteRequest } from "@/lib/data/quote-requests";

export function QuoteRequestsPanel({ requests }: { requests: OpportunityQuoteRequest[] }) {
  if (requests.length === 0) return null;
  const latest = requests[0];
  const newCount = requests.filter((request) => request.status === "new").length;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-signal-orange/25 bg-white shadow-[0_16px_45px_rgba(31,41,55,0.08)]">
      <div className="flex flex-col gap-4 bg-charcoal p-5 text-white sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-signal-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Inbound</span>
            {newCount > 0 && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white">{newCount} new</span>}
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">Quote request received</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">This person responded through TradeSignal outreach for this exact opportunity. Their contact permission is recorded against the request.</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-white/50">{formatDateTime(latest.submittedAt)}</span>
      </div>

      <div className="divide-y divide-light-grey">
        {requests.map((request, index) => (
          <article key={request.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-lg font-bold text-charcoal">{request.name}</h3>
                  <StatusBadge status={request.status} />
                  <span className="rounded-full bg-soft-surface px-2 py-1 text-[10px] font-semibold text-slate">{audienceLabel(request.audienceType)}</span>
                </div>
                <p className="mt-1 text-xs text-slate">Preferred contact: {preferredLabel(request.preferredContactMethod)}</p>
              </div>
              {index > 0 && <span className="shrink-0 text-xs text-slate">{formatDateTime(request.submittedAt)}</span>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {request.phone && (
                <a href={`tel:${request.phone.replace(/[^+\d]/g, "")}`} className="inline-flex items-center justify-center rounded-xl bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-orange">Call {request.name.split(" ")[0]}</a>
              )}
              {request.email && (
                <a href={`mailto:${encodeURIComponent(request.email)}`} className="inline-flex items-center justify-center rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange">Email</a>
              )}
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {request.phone && <ContactDetail label="Phone" value={request.phone} />}
              {request.email && <ContactDetail label="Email" value={request.email} />}
            </dl>

            {request.message && (
              <div className="mt-4 rounded-2xl bg-soft-surface p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Message</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-charcoal">{request.message}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ContactDetail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-light-grey bg-soft-surface p-3"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">{label}</dt><dd className="mt-1 break-all text-sm font-semibold text-charcoal">{value}</dd></div>;
}

function StatusBadge({ status }: { status: OpportunityQuoteRequest["status"] }) {
  const active = status === "new";
  const success = status === "won";
  const classes = active ? "bg-signal-orange/10 text-signal-orange" : success ? "bg-success/10 text-success" : "bg-soft-surface text-slate";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${classes}`}>{status.replace(/_/g, " ")}</span>;
}

function audienceLabel(audience: OpportunityQuoteRequest["audienceType"]) {
  if (audience === "homeowner") return "Homeowner response";
  if (audience === "professional") return "Professional response";
  if (audience === "business") return "Business response";
  return "Project response";
}

function preferredLabel(value: OpportunityQuoteRequest["preferredContactMethod"]) {
  if (value === "phone") return "Phone";
  if (value === "email") return "Email";
  return "Phone or email";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
