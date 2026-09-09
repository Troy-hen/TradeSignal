"use client";

import { useEffect, useState, useTransition } from "react";
import {
  generateOutreach,
  getOutreachStatus,
  type OutreachContent,
  type OutreachUsage,
} from "@/lib/actions/outreach";

export function OutreachAssistant({ opportunityId }: { opportunityId: string }) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState<OutreachContent | null>(null);
  const [usage, setUsage] = useState<OutreachUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOutreachStatus(opportunityId).then((result) => {
      if (!cancelled && result.data) setUsage(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const limitReached =
    usage !== null &&
    (usage.remaining_generations <= 0 ||
      usage.daily_remaining <= 0 ||
      usage.monthly_remaining <= 0);

  const limitMessage =
    usage === null
      ? null
      : usage.remaining_generations <= 0
        ? "Two drafts are allowed per opportunity."
        : usage.daily_remaining <= 0
          ? "Your workspace has reached today's outreach limit."
          : usage.monthly_remaining <= 0
            ? "Your workspace has reached this month's outreach limit."
            : null;

  function refreshUsage() {
    getOutreachStatus(opportunityId).then((result) => {
      if (result.data) setUsage(result.data);
    });
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateOutreach(opportunityId);
      if (result.error) {
        setError(result.error);
        refreshUsage();
      } else if (result.data) {
        setContent(result.data);
        refreshUsage();
      }
    });
  }

  return (
    <div className="rounded-md border border-light-grey bg-white p-4">
      <h3 className="font-semibold text-charcoal">Outreach Assistant</h3>
      <p className="mt-1 text-sm text-slate">
        AI-drafted copy based only on the facts on this page — no applicant name or contact details are ever
        used. Review and personalise before sending; nothing is sent automatically.
      </p>

      <p className="mt-3 text-xs font-medium text-slate">
        {usage
          ? String(usage.used_generations) +
            " of 2 drafts used for this opportunity · " +
            String(usage.daily_remaining) +
            " left today · " +
            String(usage.monthly_remaining) +
            " left this month"
          : "Checking your outreach allowance…"}
      </p>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending || limitReached}
        aria-busy={isPending}
        className="mt-3 rounded-md bg-signal-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Generating…"
          : limitReached
            ? "Generation limit reached"
            : content
              ? "Generate another draft"
              : "Generate outreach copy"}
      </button>

      {limitReached && limitMessage && <p className="mt-2 text-sm text-slate">{limitMessage}</p>}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {content && (
        <div className="mt-4 space-y-4">
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
