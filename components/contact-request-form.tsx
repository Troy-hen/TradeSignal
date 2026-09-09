"use client";

import { useState } from "react";

const REQUEST_TYPES = [
  ["territory", "Territory availability"],
  ["account", "Account or access"],
  ["billing", "Billing"],
  ["data", "Data coverage"],
  ["partnership", "Partnership"],
  ["other", "Something else"],
] as const;

export function ContactRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitted(false);
    setError(null);

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "We could not send your request. Please try again.");
        return;
      }
      form.reset();
      setSubmitted(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-light-grey bg-white p-7 sm:p-9">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Send a request</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Tell us what you need.</h2>
        <p className="mt-2 text-sm leading-6 text-slate">
          We&apos;ll review your message and reply when the support mailbox is connected. No automated email is sent from this form yet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required maxLength={120} />
        <Field label="Email" name="email" type="email" required maxLength={320} />
        <Field label="Company (optional)" name="company_name" maxLength={160} />
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Request type</span>
          <select name="request_type" defaultValue="territory" className="w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15">
            {REQUEST_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <Field label="Postcode district (optional)" name="postcode_district" placeholder="e.g. NR15" maxLength={8} />
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Message</span>
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={4000}
            rows={5}
            placeholder="Tell us what you are trying to do or where you got stuck."
            className="w-full resize-y rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
          />
        </label>

        <div className="sm:col-span-2">
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Sending…" : "Submit request"}
          </button>
          {submitted && <p role="status" className="mt-3 text-sm font-medium text-success">Thanks — your request has been recorded.</p>}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-light-grey bg-white px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15"
      />
    </label>
  );
}
