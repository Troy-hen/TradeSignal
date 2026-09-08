const LABELS: Record<string, string> = {
  hot: "HOT",
  strong: "STRONG",
  possible: "POSSIBLE",
  low: "LOW",
};

const CLASSES: Record<string, string> = {
  hot: "badge-hot",
  strong: "badge-strong",
  possible: "badge-possible",
  low: "badge-low",
};

export function OpportunityBadge({
  bucket,
  score,
  variant = "pill",
}: {
  bucket: string | null;
  score?: number | null;
  variant?: "pill" | "tile";
}) {
  const key = bucket ?? "low";
  const label = LABELS[key] ?? "LOW";

  if (variant === "tile") {
    return (
      <span
        className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${CLASSES[key] ?? CLASSES.low}`}
        aria-label={`${typeof score === "number" ? Math.round(score) : "No"} ${label.toLowerCase()} opportunity`}
      >
        <span className="text-xl font-bold leading-none">{typeof score === "number" ? Math.round(score) : "—"}</span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em]">{label}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${CLASSES[key] ?? CLASSES.low}`}>
      {typeof score === "number" && <span>{Math.round(score)}</span>}
      {label}
    </span>
  );
}

export function formatGbp(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1_000_000) return `£${formatCompact(value / 1_000_000)}m`;
  if (value >= 1000) return `£${formatCompact(value / 1000)}k`;
  return `£${Math.round(value)}`;
}

function formatCompact(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatGbpRange(low: number | null | undefined, high: number | null | undefined): string {
  if (low === null || low === undefined) return formatGbp(high);
  if (high === null || high === undefined) return formatGbp(low);
  return `${formatGbp(low)}–${formatGbp(high)}`;
}
