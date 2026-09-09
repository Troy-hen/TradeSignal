export function ContactEnrichmentPanel({
  planningApplicationId,
  applicantName,
  agentCompany,
  sourceUrl,
}: {
  planningApplicationId: string;
  applicantName: string | null;
  agentCompany: string | null;
  sourceUrl: string | null;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-light-grey bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Contact context</p>
          <h2 className="mt-2 text-sm font-semibold text-charcoal">Use public details carefully.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            Public planning records may identify an applicant or agent, but they do not guarantee a telephone number or email address. MyTradeBox keeps contact enrichment optional and records source, purpose, lawful basis, retrieval date, expiry and suppression status for every verified result.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">GDPR controls on</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ContactValue label="Applicant" value={applicantName ?? "Not supplied by the planning record"} />
        <ContactValue label="Agent / organisation" value={agentCompany ?? "Not supplied by the planning record"} />
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-soft-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-charcoal">Optional contact enrichment</p>
          <p className="mt-1 text-xs leading-5 text-slate">
            Up to 5 verified lookups per workspace each month. Enrichment is only permitted for an active opportunity, and each result must show provenance and an expiry date before it can be used.
          </p>
        </div>
        <button
          type="button"
          disabled
          title="A contact-enrichment provider must be configured before lookups can run."
          className="shrink-0 rounded-xl border border-light-grey bg-white px-3 py-2 text-xs font-semibold text-slate opacity-70"
        >
          Provider connection required
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate">
        {sourceUrl ? "Current provenance: public planning record · source link available above." : "Current provenance: public planning record · no source link supplied."} Reference: {planningApplicationId.slice(0, 8)}…
      </p>
    </section>
  );
}

function ContactValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-light-grey px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate">{label}</p>
      <p className="mt-1 text-sm text-charcoal">{value}</p>
    </div>
  );
}
