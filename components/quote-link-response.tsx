"use client";

import { useEffect, useState } from "react";

type Audience = "homeowner" | "professional" | "business" | "unknown";
type EngagementEvent = "call_clicked" | "whatsapp_clicked" | "quote_started" | "not_interested";

export function QuoteLinkResponse({
  token,
  tradingName,
  phone,
  audienceType,
  projectType,
}: {
  token: string;
  tradingName: string;
  phone: string | null;
  audienceType: Audience;
  projectType: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const whatsappNumber = phone ? normalizeWhatsAppNumber(phone) : null;
  const whatsappUrl = whatsappNumber ? buildWhatsAppUrl(whatsappNumber, tradingName, projectType, audienceType) : null;

  useEffect(() => {
    void fetch(`/api/q/${encodeURIComponent(token)}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_viewed" }),
      keepalive: true,
    }).catch(() => undefined);
  }, [token]);

  async function recordEvent(eventType: EngagementEvent) {
    await fetch(`/api/q/${encodeURIComponent(token)}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType }),
      keepalive: true,
    }).catch(() => undefined);
  }

  async function submitQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      preferredContactMethod: String(form.get("preferredContactMethod") ?? "either"),
      message: String(form.get("message") ?? ""),
      permissionAccepted: form.get("permissionAccepted") === "on",
    };

    try {
      const response = await fetch(`/api/q/${encodeURIComponent(token)}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error === "permission_required" ? `Please confirm that ${tradingName} can contact you about this project.` : "Your request could not be submitted. Please check your details and try again.");
      setSubmitted(true);
      setShowForm(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your request could not be submitted.");
    } finally {
      setPending(false);
    }
  }

  async function notInterested() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/q/${encodeURIComponent(token)}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "not_interested" }),
      });
      if (!response.ok) throw new Error("We couldn't save that preference just now.");
      setOptedOut(true);
      setShowForm(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't save that preference just now.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-success/20 bg-success/[0.05] p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-xl text-success">✓</div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-charcoal">Request sent</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate">{tradingName} has received your quote request and can now contact you using the details you provided.</p>
      </div>
    );
  }

  if (optedOut) {
    return (
      <div className="rounded-3xl border border-light-grey bg-soft-surface p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold tracking-tight text-charcoal">Preference saved</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate">{tradingName} will not send further MyTradeBox outreach for this opportunity.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={`grid gap-3 ${phone || whatsappUrl ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-1"}`}>
        {phone && (
          <a
            href={`tel:${phone.replace(/[^+\d]/g, "")}`}
            onClick={() => void recordEvent("call_clicked")}
            className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-charcoal px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-signal-orange"
          >
            Call {tradingName}
          </a>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => void recordEvent("whatsapp_clicked")}
            className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-charcoal/15 bg-white px-5 py-3 text-center text-sm font-semibold text-charcoal transition hover:border-signal-orange/50 hover:text-signal-orange"
          >
            WhatsApp {tradingName}
          </a>
        )}
        <button
          type="button"
          onClick={() => { setShowForm(true); void recordEvent("quote_started"); }}
          className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-charcoal"
        >
          Request a quote
        </button>
      </div>

      {whatsappUrl && !showForm && (
        <p className="mt-3 text-center text-[11px] leading-5 text-slate">WhatsApp opens a pre-filled conversation on your device. MyTradeBox records the click, not whether a message was actually sent.</p>
      )}

      {showForm && (
        <form onSubmit={submitQuote} className="mt-6 rounded-3xl border border-light-grey bg-white p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-signal-orange">Request a quote</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-charcoal">Tell {tradingName} how to reach you</h2>
            <p className="mt-2 text-sm leading-6 text-slate">This request is linked to the {projectType ? projectType.toLowerCase() : "project"} that prompted the introduction, without exposing private planning details here.</p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" required autoComplete="name" />
            <Field label="Email" name="email" type="email" autoComplete="email" />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
            <label className="text-sm font-medium text-charcoal">
              Preferred contact
              <select name="preferredContactMethod" defaultValue="either" className="mt-1.5 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm outline-none focus:border-signal-orange">
                <option value="either">Phone or email</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-charcoal">
            Anything you&apos;d like them to know? <span className="font-normal text-slate">Optional</span>
            <textarea name="message" rows={4} maxLength={1500} className="mt-1.5 w-full resize-y rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm outline-none focus:border-signal-orange" />
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-2xl bg-soft-surface p-4 text-sm leading-6 text-charcoal">
            <input name="permissionAccepted" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-signal-orange" />
            <span>I&apos;d like {tradingName} to contact me about this project using the contact details I&apos;ve provided.</span>
          </label>
          <p className="mt-2 text-xs leading-5 text-slate">This permission is for this project contact request. It is not consent to unrelated marketing.</p>

          {error && <p className="mt-4 rounded-xl bg-danger/[0.05] p-3 text-sm text-danger">{error}</p>}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate hover:bg-soft-surface">Cancel</button>
            <button type="submit" disabled={pending} className="rounded-xl bg-signal-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-charcoal disabled:opacity-50">{pending ? "Sending…" : "Request my quote"}</button>
          </div>
        </form>
      )}

      {!showForm && (
        <div className="mt-6 text-center">
          <button type="button" disabled={pending} onClick={() => void notInterested()} className="text-xs font-medium text-slate underline-offset-4 hover:text-charcoal hover:underline disabled:opacity-50">Not interested in contact about this opportunity</button>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      )}

      <p className="mt-6 text-center text-xs leading-5 text-slate">{audienceType === "homeowner" ? "This introduction was prompted by publicly available planning information." : "This introduction relates to a planning/project opportunity relevant to your organisation."}</p>
    </div>
  );
}

function normalizeWhatsAppNumber(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function buildWhatsAppUrl(number: string, tradingName: string, projectType: string | null, audienceType: Audience) {
  const project = projectType ? ` about the ${projectType.toLowerCase()} project` : " about the project";
  const message = audienceType === "homeowner"
    ? `Hi ${tradingName}, I received your introduction${project} and I'd like to discuss a quote.`
    : `Hi ${tradingName}, I saw your project introduction${project} and I'd like to discuss it.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function Field({ label, name, type = "text", required = false, autoComplete }: { label: string; name: string; type?: string; required?: boolean; autoComplete?: string }) {
  return (
    <label className="text-sm font-medium text-charcoal">
      {label}{required ? " *" : ""}
      <input name={name} type={type} required={required} autoComplete={autoComplete} maxLength={200} className="mt-1.5 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm outline-none focus:border-signal-orange" />
    </label>
  );
}
