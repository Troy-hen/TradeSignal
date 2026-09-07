/**
 * Placeholder recreation of Troy's supplied brand mark (angular "T"/"S" monogram)
 * using the exact brand colors. Swap for the real exported SVG/PNG in public/
 * once file upload access is available — see README "Branding" section.
 */
export function LogoMark({ className, dark = true }: { className?: string; dark?: boolean }) {
  const tColor = dark ? "#FFFFFF" : "#1F2937";
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {dark && <rect width="64" height="64" rx="14" fill="#1F2937" />}
      {/* T - angular chevron top bar + stem */}
      <path d="M10 21 L24 21 L18 27 L10 27 Z" fill={tColor} />
      <path d="M24 21 L30 21 L30 43 L24 43 Z" fill={tColor} />
      {/* S - two interlocking chevrons */}
      <path d="M32 27 L48 27 L42 33 L30 33 A6 6 0 0 0 30 39 L46 39 L40 45 L28 45 A6 6 0 0 1 32 27 Z" fill="#FF6A00" />
    </svg>
  );
}

export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className={`font-bold tracking-tight ${wordmarkClassName ?? "text-xl"}`}>
        <span className="text-charcoal">Trade</span>
        <span className="text-signal-orange">Signal</span>
      </span>
    </span>
  );
}
