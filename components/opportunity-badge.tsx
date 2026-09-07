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
}: {
  bucket: string | null;
  score?: number | null;
}) {
  const key = bucket ?? "low";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${CLASSES[key] ?? CLASSES.low}`}
    >
      {typeof score === "number" && <span>{Math.round(score)}</span>}
      {LABELS[key] ?? "LOW"}
    </span>
  );
}

export function formatGbp(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1000) return `£${Math.round(value / 1000)}k`;
  return `£${Math.round(value)}`;
}

export function formatGbpRange(low: number | null | undefined, high: number | null | undefined): string {
  if (low === null || low === undefined) return formatGbp(high);
  if (high === null || high === undefined) return formatGbp(low);
  return `${formatGbp(low)}–${formatGbp(high)}`;
}
