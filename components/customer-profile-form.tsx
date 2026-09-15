"use client";

import { useState } from "react";

type NormalizedProfile = {
  label?: string;
  keywords?: string[];
  buyerTypes?: string[];
  source?: "ai" | "fallback";
  confidence?: number;
};

type InitialProfile = {
  what_do_you_sell?: string;
  ideal_customer?: string | null;
  exclusions?: string | null;
  where_do_you_sell?: string | null;
  normalized_profile?: NormalizedProfile | null;
};

export function CustomerProfileForm({ initial }: { initial?: InitialProfile | null }) {
  const [whatDoYouSell, setWhatDoYouSell] = useState(initial?.what_do_you_sell ?? "");
  const [idealCustomer, setIdealCustomer] = useState(initial?.ideal_customer ?? "");
  const [exclusions, setExclusions] = useState(initial?.exclusions ?? "");
  const [whereDoYouSell, setWhereDoYouSell] = useState(initial?.where_do_you_sell ?? "");
  const [normalized, setNormalized] = useState<NormalizedProfile | null>(initial?.normalized_profile ?? null);
  const [normalizedFor, setNormalizedFor] = useState(initial?.what_do_you_sell ?? "");
  const [busy, setBusy] = useState<"normalise" | "save" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function requestNormalization(value: string): Promise<NormalizedProfile> {
    const response = await fetch("/api/profile/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ what_do_you_sell: value }),
    });
    const body = await response.json().catch(() => ({})) as { profile?: NormalizedProfile };
    if (!response.ok || !body.profile) throw new Error("normalise_failed");
    return body.profile;
  }

  async function normalise() {
    const input = whatDoYouSell.trim();
    if (!input) return;
    setBusy("normalise");
    setMessage(null);
    try {
      const profile = await requestNormalization(input);
      setNormalized(profile);
      setNormalizedFor(input);
      setMessage("Profile normalised. Review it, then save your context.");
    } catch {
      setMessage("We could not normalise that description yet. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    const input = whatDoYouSell.trim();
    if (!input) return;
    setBusy("save");
    setMessage(null);
    try {
      let profile = normalized;
      if (!profile || normalizedFor.trim() !== input) {
        profile = await requestNormalization(input);
        setNormalized(profile);
        setNormalizedFor(input);
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          what_do_you_sell: input,
          ideal_customer: idealCustomer.trim() || null,
          exclusions: exclusions.trim() || null,
          where_do_you_sell: whereDoYouSell.trim() || null,
          normalized_profile: profile,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      setMessage("Saved. New marketplace matches will use this context.");
    } catch {
      setMessage("We could not save your profile yet. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">What do you sell?</span>
          <textarea value={whatDoYouSell} onChange={(event) => { setWhatDoYouSell(event.target.value); setNormalized(null); }} placeholder="Describe your products or services in your own words — for example, commercial CCTV, access control and alarm monitoring for hospitality and retail businesses." rows={4} maxLength={500} className="w-full resize-y rounded-2xl border border-light-grey bg-white px-4 py-3 text-sm leading-6 text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" />
          <p className="mt-2 text-xs leading-5 text-slate">Free text is normalised by AI into services, buyer types and likely needs. You do not need to choose a vertical.</p>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Who do you sell to? <span className="font-normal normal-case tracking-normal">Optional</span></span><input value={idealCustomer} onChange={(event) => setIdealCustomer(event.target.value)} placeholder="e.g. independent hospitality groups" className="w-full rounded-xl border border-light-grey px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">Where do you sell? <span className="font-normal normal-case tracking-normal">Optional</span></span><input value={whereDoYouSell} onChange={(event) => setWhereDoYouSell(event.target.value)} placeholder="e.g. Norfolk and Suffolk" className="w-full rounded-xl border border-light-grey px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label>
        </div>

        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.11em] text-slate">What should we leave out? <span className="font-normal normal-case tracking-normal">Optional</span></span><input value={exclusions} onChange={(event) => setExclusions(event.target.value)} placeholder="e.g. domestic work or projects below £5k" className="w-full rounded-xl border border-light-grey px-4 py-3 text-sm text-charcoal placeholder:text-slate/60 focus:border-signal-orange focus:outline-none focus:ring-2 focus:ring-signal-orange/15" /></label>
      </div>

      {normalized && <div className="rounded-2xl border border-success/20 bg-success/[0.045] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-success">Normalised profile</p><p className="mt-1 text-sm font-semibold text-charcoal">{normalized.label ?? whatDoYouSell}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-success">{normalized.source === "ai" ? "AI matched" : "Preview matched"}</span></div>{normalized.keywords?.length ? <div className="mt-3 flex flex-wrap gap-2">{normalized.keywords.map((keyword) => <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate">{keyword}</span>)}</div> : null}{normalized.buyerTypes?.length ? <p className="mt-3 text-xs text-slate">Likely buyers: {normalized.buyerTypes.join(", ")}</p> : null}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-slate">Coverage still controls geography. This profile controls relevance across every enabled source.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={normalise} disabled={busy !== null || !whatDoYouSell.trim()} className="rounded-xl border border-signal-orange/40 bg-white px-4 py-2.5 text-sm font-semibold text-signal-orange transition hover:border-signal-orange disabled:cursor-not-allowed disabled:opacity-50">{busy === "normalise" ? "Normalising…" : "Preview normalisation"}</button><button type="button" onClick={save} disabled={busy !== null || !whatDoYouSell.trim()} className="rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-50">{busy === "save" ? "Saving…" : "Save profile"}</button></div></div>
      {message && <p role="status" className="rounded-xl bg-soft-surface px-4 py-3 text-sm text-slate">{message}</p>}
    </div>
  );
}
