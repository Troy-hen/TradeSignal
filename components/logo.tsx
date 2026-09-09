import Image from "next/image";

type LogoTone = "dark" | "light";

// The supplied dark asset has white cube sides; the light asset keeps the
// same geometry but uses charcoal sides so it remains visible on white.
const darkIconSrc = "/brand/mytradebox-icon.png";
const lightIconSrc = "/brand/mytradebox-icon-light.png";

export function LogoMark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: LogoTone;
}) {
  const fixedDarkTone = tone === "light";
  const tileClass = fixedDarkTone
    ? "border border-white/15 bg-[#1f2937]"
    : "border border-[#e5e7eb] bg-[#f8fafc] dark:border-white/15 dark:bg-[#1f2937]";

  return (
    <span
      className={
        "inline-flex items-center justify-center overflow-hidden rounded-xl " +
        tileClass +
        " " +
        (className ?? "")
      }
    >
      {fixedDarkTone ? (
        <Image
          src={darkIconSrc}
          alt=""
          width={1254}
          height={1254}
          className="h-full w-full object-contain"
        />
      ) : (
        <>
          <Image
            src={lightIconSrc}
            alt=""
            width={1254}
            height={1254}
            className="h-full w-full object-contain dark:hidden"
          />
          <Image
            src={darkIconSrc}
            alt=""
            width={1254}
            height={1254}
            className="hidden h-full w-full object-contain dark:block"
          />
        </>
      )}
    </span>
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
  const fixedLightTone = tone === "light";
  const wordmarkClass =
    "whitespace-nowrap font-sans text-xl font-semibold tracking-[-0.03em] " +
    (wordmarkClassName ?? "");
  const wordmarkTone = fixedLightTone ? "text-white" : "text-charcoal";
  const dividerTone = fixedLightTone ? "bg-white/40" : "bg-[#cbd5e1] dark:bg-white/30";

  return (
    <span className={"inline-flex items-center gap-3 " + (className ?? "")}>
      <LogoMark className="h-9 w-9 shrink-0" tone={tone} />
      <span className={"h-6 w-px " + dividerTone} aria-hidden="true" />
      <span className={wordmarkClass}>
        <span className={wordmarkTone}>MyTrade</span>
        <span className="text-signal-orange">Box</span>
      </span>
    </span>
  );
}
