"use client";

import { useMemo, useState } from "react";
import { coveragePriceBreakdown, formatMonthlyGbp } from "@/lib/coverage/pricing";

export type CoverageTradeOption = {
  id: string;
  name: string;
  slug: string;
};

export type CoverageDistrictOption = {
  id: string;
  town: string;
};

export type CoveragePlanView = {
  id: string;
  tradeCategoryId: string;
  tradeName: string;
  status: string;
  billingMode: "custom" | "county";
  monthlyPricePence: number;
  districts: string[];
};

type CoverageBuilderProps = {
  trades: CoverageTradeOption[];
  districts: CoverageDistrictOption[];
  existingTradeIds: string[];
  countyAreas: { id: string; name: string }[];
};

type CoveragePlanEditorProps = {
  plan: CoveragePlanView;
  districts: CoverageDistrictOption[];
};

const ERROR_COPY: Record<string, string> = {
  billing_update_required: "This plan has paid billing attached. Coverage changes will be available from Billing once Stripe plan updates are enabled.",
  territory_unavailable: "One of those districts was just claimed by another business. Remove it and try again.",
  unknown_territory: "We could not recognise one of the selected postcode districts.",
  coverage_change_failed: "We could not save that coverage change. No partial change was applied.",
};

export function CoverageBuilder({ trades, districts, existingTradeIds, countyAreas }: CoverageBuilderProps) {
  const availableTrades = useMemo(
    () => trades.filter((trade) => !existingTradeIds.includes(trade.id)),
    [existingTradeIds, trades],
  );
  const [tradeId, setTradeId] = useState(availableTrades[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const breakdown = selected.length > 0 ? coveragePriceBreakdown(selected.length, "custom") : null;

  function toggleDistrict(district: string) {
    setSelected((current) =>
      current.includes(district) ? current.filter((item) => item !== district) : [...current, district],
    );
    setError(null);
  }

  function addDistrictGroup(group: string[]) {
    setSelected((current) => Array.from(new Set([...current, ...group])));
    setError(null);
  }

  async function startCoverage() {
    if (!tradeId || selected.length === 0) {
      setError("Choose a trade and at least one postcode district.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/territory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode_districts: [...selected].sort(),
          trade_category_id: tradeId,
          billing_mode: "custom",
        }),
      });
      const body = await response.json().catch(() => ({} as { error?: string; url?: string }));
      if (!response.ok || !body.url) {
        setError(ERROR_COPY[body.error ?? ""] ?? "We could not start coverage checkout.");
        setIsSubmitting(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Network error — please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">Add coverage</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">Build the service area you actually work.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
            Choose one trade and as many postcode districts as you need. The first is £29.99/month, then volume pricing applies automatically.
          </p>
        </div>
        <div className="rounded-2xl bg-signal-orange/10 px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Selected</p>
          <p className="mt-1 text-2xl font-bold text-charcoal">{selected.length}</p>
        </div>
      </div>

      {availableTrades.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-light-grey bg-soft-surface p-5 text-sm leading-6 text-slate">
          You already have coverage for every active trade category. Adjust a current plan above or contact us if your team needs a different trade setup.
        </div>
      ) : (
        <>
          <div className="mt-7 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">Trade</span>
              <select
                value={tradeId}
                onChange={(event) => {
                  setTradeId(event.target.value);
                  setSelected([]);
                  setError(null);
                }}
                className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-3 text-sm font-medium text-charcoal outline-none focus:border-signal-orange"
              >
                {availableTrades.map((trade) => (
                  <option key={trade.id} value={trade.id}>
                    {trade.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.11em] text-slate">Postcode districts</span>
              <DistrictPicker
                districts={districts}
                selected={selected}
                query={query}
                onQueryChange={setQuery}
                onToggle={toggleDistrict}
                onAddGroup={addDistrictGroup}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-light-grey pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-charcoal">
                {breakdown ? formatMonthlyGbp(breakdown.monthlyPricePence) : "£0.00"}
                <span className="ml-1 text-xs font-normal text-slate">/month</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-slate">
                {breakdown
                  ? "Includes " + String(breakdown.postcodeCount) + " postcode " + (breakdown.postcodeCount === 1 ? "district." : "districts.")
                  : "Select districts to see your monthly total."}
              </p>
            </div>
            <button
              type="button"
              onClick={startCoverage}
              disabled={isSubmitting || selected.length === 0}
              className="inline-flex items-center justify-center rounded-xl bg-signal-orange px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Starting checkout…" : "Continue with coverage"}
            </button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        </>
      )}

      <p className="mt-6 text-xs leading-5 text-slate">
        {countyAreas.length > 0
          ? "Town/city shortcuts select loaded districts. Verified county bundles are available for selected areas."
          : "Town/city shortcuts select loaded districts; remove any you do not serve. County bundles will appear once verified boundaries are loaded."}
      </p>
    </section>
  );
}

export function CoveragePlanEditor({ plan, districts }: CoveragePlanEditorProps) {
  const [selected, setSelected] = useState<string[]>(plan.districts);
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const breakdown = selected.length > 0 ? coveragePriceBreakdown(selected.length, "custom") : null;
  const changed = selected.slice().sort().join("|") !== plan.districts.slice().sort().join("|");

  function toggleDistrict(district: string) {
    setSelected((current) =>
      current.includes(district) ? current.filter((item) => item !== district) : [...current, district],
    );
    setMessage(null);
    setError(null);
  }

  function addDistrictGroup(group: string[]) {
    setSelected((current) => Array.from(new Set([...current, ...group])));
    setMessage(null);
    setError(null);
  }

  async function saveChanges() {
    if (selected.length === 0) {
      setError("Keep at least one postcode district in this coverage plan.");
      return;
    }
    if (!changed) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/coverage/" + plan.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode_districts: [...selected].sort() }),
      });
      const body = await response.json().catch(() => ({} as { error?: string; monthly_price_pence?: number }));
      if (!response.ok) {
        setError(ERROR_COPY[body.error ?? ""] ?? "We could not save that coverage change.");
        setIsSaving(false);
        return;
      }
      setMessage("Coverage updated. Your monthly total is now " + formatMonthlyGbp(Number(body.monthly_price_pence)) + ".");
      setIsSaving(false);
    } catch {
      setError("Network error — please try again.");
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-light-grey bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">Active coverage</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal">{plan.tradeName}</h2>
          <p className="mt-2 text-sm leading-6 text-slate">
            {plan.status === "active" ? "Your exclusive feed is active." : "This coverage plan is being reserved."} Choose the districts that fit your budget.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-bold text-charcoal">{breakdown ? formatMonthlyGbp(breakdown.monthlyPricePence) : formatMonthlyGbp(plan.monthlyPricePence)}</p>
          <p className="text-xs text-slate">per month · {selected.length} {selected.length === 1 ? "district" : "districts"}</p>
        </div>
      </div>

      <div className="mt-7">
        <DistrictPicker
          districts={districts}
          selected={selected}
          query={query}
          onQueryChange={setQuery}
          onToggle={toggleDistrict}
          onAddGroup={addDistrictGroup}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate">
          {changed ? "Your next save recalculates the volume price automatically." : "Add or remove districts whenever your service area changes."}
        </p>
        <button
          type="button"
          onClick={saveChanges}
          disabled={isSaving || !changed}
          className="inline-flex items-center justify-center rounded-xl border border-signal-orange px-4 py-2.5 text-sm font-semibold text-signal-orange transition hover:bg-signal-orange hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save coverage"}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-success">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}

function DistrictPicker({
  districts,
  selected,
  query,
  onQueryChange,
  onToggle,
  onAddGroup,
}: {
  districts: CoverageDistrictOption[];
  selected: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (district: string) => void;
  onAddGroup: (districts: string[]) => void;
}) {
  const filtered = districts.filter((district) => district.id.toLowerCase().includes(query.trim().toLowerCase()));
  const townGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const district of districts) {
      const town = district.town || "Other";
      const group = groups.get(town) ?? [];
      group.push(district.id);
      groups.set(town, group);
    }
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [districts]);

  return (
    <div className="mt-2 rounded-2xl border border-light-grey bg-soft-surface p-3">
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search districts, e.g. IP1"
        aria-label="Search postcode districts"
        className="w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm text-charcoal outline-none focus:border-signal-orange"
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">Quick add a town / city</span>
          <select
            defaultValue=""
            onChange={(event) => {
              const town = event.target.value;
              const group = townGroups.find(([name]) => name === town)?.[1] ?? [];
              if (group.length > 0) onAddGroup(group);
              event.currentTarget.value = "";
            }}
            aria-label="Quick add a town or city"
            className="mt-2 w-full rounded-xl border border-light-grey bg-white px-3 py-2.5 text-sm font-medium text-charcoal outline-none focus:border-signal-orange"
          >
            <option value="">Select a loaded town…</option>
            {townGroups.map(([town, group]) => (
              <option key={town} value={town}>
                {town} ({group.length} {group.length === 1 ? "district" : "districts"})
              </option>
            ))}
          </select>
        </label>
        <p className="self-end text-xs leading-5 text-slate">
          Selects the currently loaded districts for that place. Remove any you do not serve before saving.
        </p>
      </div>
      <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Postcode districts">
        {filtered.map((district) => {
          const checked = selected.includes(district.id);
          return (
            <label
              key={district.id}
              className={
                checked
                  ? "flex cursor-pointer items-center gap-2 rounded-xl border border-signal-orange/30 bg-signal-orange/10 px-3 py-2 text-sm font-semibold text-charcoal"
                  : "flex cursor-pointer items-center gap-2 rounded-xl border border-transparent bg-white px-3 py-2 text-sm font-medium text-slate hover:border-light-grey hover:text-charcoal"
              }
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(district.id)}
                className="h-4 w-4 accent-signal-orange"
              />
              <span className="min-w-0">
                <span className="block">{district.id}</span>
                <span className="block truncate text-[10px] font-normal text-slate">{district.town}</span>
              </span>
            </label>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="px-2 py-4 text-sm text-slate">No loaded districts match that search.</p>}
    </div>
  );
}
