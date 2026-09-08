"use client";

import { useState, useTransition } from "react";
import { generateOutreach, type OutreachContent } from "@/lib/actions/outreach";

export function OutreachAssistant({ opportunityId }: { opportunityId: string }) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState<OutreachContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateOutreach(opportunityId);
      if (result.error) setError(result.error);
      else if (result.data) setContent(result.data);
    });
  }

  return (
    <div className="rounded-md border border-light-grey bg-white p-4">
      <h3 className="font-semibold text-charcoal">Outreach Assistant</h3>
      <p className="mt-1 text-sm text-slate">
        AI-drafted copy based only on the facts on this page — no applicant name or contact details are ever
        used. Review and personalise before sending; nothing is sent automatically.
      </p>
      {!content && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="mt-3 rounded-md bg-signal-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {isPending ? "Generating…" : "Generate outreach copy"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {content && (
        <div className="mt-3 space-y-4">
          <OutreachBlock label="Introductory letter" text={content.intro_letter} />
          <OutreachBlock label="Phone call opener" text={content.phone_opener} />
          <OutreachBlock label="Doorstep script" text={content.doorstep_script} />
        </div>
      )}
    </div>
  );
}

function OutreachBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</p>
      <pre className="mt-1 whitespace-pre-wrap rounded-md bg-soft-surface p-3 font-sans text-sm text-charcoal">{text}</pre>
    </div>
  );
}
