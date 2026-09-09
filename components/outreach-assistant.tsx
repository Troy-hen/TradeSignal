"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  generateOutreach,
  getOutreachStatus,
  type OutreachContent,
  type OutreachUsage,
} from "@/lib/actions/outreach";

type Channel = "letter" | "phone" | "doorstep";
type Capabilities = { postalOutreach?: boolean };
type PostalPreview = {
  deliveryId?: string;
  preview?: { previewUrl?: string | null; estimatedCostPence?: number | null };
  recipient?: { name?: string | null; addressLine1?: string; postcode?: string };
  recipientLabel?: string;
};

export function OutreachAssistant({ opportunityId }: { opportunityId: string }) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState<OutreachContent | null>(null);
  const [usage, setUsage] = useState<OutreachUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>("letter");
  const [postalEnabled, setPostalEnabled] = useState(false);
  const [postalPreview, setPostalPreview] = useState<PostalPreview | null>(null);
  const [postalBusy, setPostalBusy] = useState(false);
  const [postalMessage, setPostalMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOutreachStatus(opportunityId).then((result) => {
      if (!cancelled && result.data) setUsage(result.data);
    });
    fetch("/api/capabilities", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: Capabilities | null) => {
        if (cancelled) return;
        const enabled = Boolean(data?.postalOutreach);
        setPostalEnabled(enabled);
        if (enabled) fetch("/api/outreach/postal/sync", { method: "POST" }).catch(() => {});
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [opportunityId]);

  const limitReached = usage !== null && (usage.remaining_generations <= 0 || usage.daily_remaining <= 0 || usage.monthly_remaining <= 0);
  const limitMessage = usage === null ? null : usage.remaining_generations <= 0 ? "Two drafts are allowed per opportunity." : usage.daily_remaining <= 0 ? "Your workspace has reached today's outreach limit." : usage.monthly_remaining <= 0 ? "Your workspace has reached this month's outreach limit." : null;

  const selectedText = useMemo(() => {
    if (!content) return null;
    if (channel === "phone") return content.phone_opener;
    if (channel === "doorstep") return content.doorstep_script;
    return content.intro_letter;
  }, [channel, content]);

  function refreshUsage() {
    getOutreachStatus(opportunityId).then((result) => { if (result.data) setUsage(result.data); });
  }

  function handleGenerate() {
    setError(null);
    setPostalPreview(null);
    setPostalMessage(null);
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

  function downloadDraft() {
    if (!selectedText) return;
    const blob = new Blob([selectedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mytradebox-${channel}-draft.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function previewPostalLetter() {
    if (!selectedText || postalBusy) return;
    setPostalBusy(true);
    setPostalMessage(null);
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/postal/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selectedText }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPostalMessage(data.error === "postal_address_not_validated" ? "The project address could not be validated for postal delivery." : "Letter preview could not be created.");
        return;
      }
      setPostalPreview(data as PostalPreview);
    } catch {
      setPostalMessage("Letter preview could not be created.");
    } finally {
      setPostalBusy(false);
    }
  }

  async function sendPostalLetter() {
    if (!selectedText || !postalPreview?.deliveryId || postalBusy) return;
    const cost = postalPreview.preview?.estimatedCostPence;
    const price = typeof cost === "number" ? ` Estimated cost: ${formatPence(cost)}.` : "";
    if (!window.confirm(`Send this letter for printing and postage?${price}`)) return;

    setPostalBusy(true);
    setPostalMessage(null);
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/postal/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selectedText, deliveryId: postalPreview.deliveryId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPostalMessage("The letter was not sent. No successful delivery was recorded.");
        return;
      }
      setPostalMessage(`Letter ${data.status === "sent" ? "sent" : data.status === "delivered" ? "delivered" : "queued"}${typeof data.costPence === "number" ? ` · ${formatPence(data.costPence)}` : ""}.`);
    } catch {
      setPostalMessage("The letter was not sent. Please try again.");
    } finally {
      setPostalBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-light-grey bg-white">
      <div className="grid lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div className="bg-charcoal p-5 text-white sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Contact this opportunity</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight">Turn the intelligence into a useful first move.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            MyTradeBox drafts outreach from the project facts already on this brief. Nothing is sent automatically, and no applicant contact details are injected into the prompt.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Allowance</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {usage ? `${usage.used_generations} of 2 drafts used · ${usage.daily_remaining} left today` : "Checking your outreach allowance…"}
            </p>
          </div>
          <button type="button" onClick={handleGenerate} disabled={isPending || limitReached} aria-busy={isPending} className="mt-4 w-full rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? "Generating…" : limitReached ? "Generation limit reached" : content ? "Generate fresh drafts" : "Generate outreach drafts"}
          </button>
          {limitReached && limitMessage && <p className="mt-2 text-xs text-white/55">{limitMessage}</p>}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <ChannelButton active={channel === "letter"} onClick={() => setChannel("letter")}>Letter</ChannelButton>
            <ChannelButton active={channel === "phone"} onClick={() => setChannel("phone")}>Phone opener</ChannelButton>
            <ChannelButton active={channel === "doorstep"} onClick={() => setChannel("doorstep")}>Doorstep</ChannelButton>
          </div>

          {selectedText ? (
            <>
              <div className="mt-5 rounded-2xl border border-light-grey bg-soft-surface p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Draft</p>
                <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-charcoal">{selectedText}</pre>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={downloadDraft} className="rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40">Download draft ↓</button>
                <button type="button" onClick={() => navigator.clipboard?.writeText(selectedText)} className="rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40">Copy text</button>
              </div>

              {channel === "letter" && postalEnabled && (
                <div className="mt-5 rounded-2xl border border-signal-orange/20 bg-signal-orange/[0.03] p-4">
                  <p className="text-sm font-semibold text-charcoal">Print & post with MyTradeBox</p>
                  <p className="mt-1 text-xs leading-5 text-slate">The project address is validated before anything can be sent. Previewing is free; live delivery always requires an explicit confirmation.</p>
                  {!postalPreview ? (
                    <button type="button" onClick={previewPostalLetter} disabled={postalBusy} className="mt-3 rounded-xl bg-signal-orange px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                      {postalBusy ? "Preparing preview…" : "Preview posted letter"}
                    </button>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {postalPreview.preview?.previewUrl && <a href={postalPreview.preview.previewUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-light-grey bg-white px-4 py-2.5 text-xs font-semibold text-charcoal">Open PDF preview ↗</a>}
                      <button type="button" onClick={sendPostalLetter} disabled={postalBusy || !postalPreview.deliveryId} className="rounded-xl bg-signal-orange px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                        {postalBusy ? "Sending…" : `Confirm & send${typeof postalPreview.preview?.estimatedCostPence === "number" ? ` · ${formatPence(postalPreview.preview.estimatedCostPence)}` : ""}`}
                      </button>
                      <button type="button" onClick={() => setPostalPreview(null)} className="px-2 py-2 text-xs font-semibold text-slate">Re-preview</button>
                    </div>
                  )}
                  {postalMessage && <p className="mt-3 text-xs font-medium text-slate">{postalMessage}</p>}
                </div>
              )}

              {!postalEnabled && <p className="mt-3 text-xs leading-5 text-slate">Review and personalise before using. Postal delivery controls appear automatically when a mail provider is connected.</p>}
            </>
          ) : (
            <div className="mt-5 flex min-h-[230px] items-center justify-center rounded-2xl border border-dashed border-light-grey bg-soft-surface p-6 text-center">
              <div>
                <p className="text-sm font-semibold text-charcoal">Generate once, then choose the right channel.</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">You will get a concise introductory letter, a phone opener and a doorstep script from the same opportunity context.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ChannelButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={active ? "rounded-xl bg-charcoal px-3 py-2 text-xs font-semibold text-white" : "rounded-xl border border-light-grey bg-white px-3 py-2 text-xs font-semibold text-charcoal transition hover:border-signal-orange/40"}>{children}</button>;
}

function formatPence(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value / 100);
}
