type LogoTone = "dark" | "light";

export function LogoMark({
  className,
  tone = "dark",
  dark,
}: {
  className?: string;
  tone?: LogoTone;
  dark?: boolean;
}) {
  const resolvedTone: LogoTone = dark === undefined ? tone : dark ? "dark" : "light";
  const panelColor = resolvedTone === "dark" ? "#1F2937" : "#FFFFFF";
  const tColor = resolvedTone === "dark" ? "#FFFFFF" : "#1F2937";

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill={panelColor} />
      <path d="M10 21 L24 21 L18 27 L10 27 Z" fill={tColor} />
      <path d="M24 21 L30 21 L30 43 L24 43 Z" fill={tColor} />
      <path
        d="M32 27 L48 27 L42 33 L30 33 A6 6 0 0 0 30 39 L46 39 L40 45 L28 45 A6 6 0 0 1 32 27 Z"
        fill="#FF6A00"
      />
    </svg>
  );
}

export function Logo({
  className,
  wordmarkClassName,
  tone = "dark",
}: {
  className?: string;
  wordmarkClassName?: string;
  tone?: LogoTone;
}) {
  const isLight = tone === "light";

  return (
    <span className={"inline-flex items-center gap-3 " + (className ?? "")}>
      <LogoMark className="h-9 w-9 shrink-0" tone={tone} />
      <span className={"h-6 w-px " + (isLight ? "bg-white/20" : "bg-light-grey")} />
      <span
        className={
          "font-sans text-xl font-semibold tracking-[-0.03em] " +
          (wordmarkClassName ?? (isLight ? "text-white" : "text-charcoal"))
        }
      >
        <span>Trade</span>
        <span className="text-signal-orange">Signal</span>
      </span>
    </span>
  );
}
