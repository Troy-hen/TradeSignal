import Image from "next/image";

type LogoTone = "dark" | "light";

const iconSrc = "/brand/mytradebox-icon.png";
const lightIconSrc = "/brand/mytradebox-icon-light.png";

export function LogoMark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: LogoTone;
}) {
  return (
    <span
      className={
        "inline-flex items-center justify-center overflow-hidden rounded-xl " +
        (tone === "light" ? "bg-[#f8fafc] dark:bg-white" : "bg-[#1f2937] dark:bg-[#f8fafc]") +
        " " +
        (className ?? "")
      }
    >
      <Image
        src={iconSrc}
        alt=""
        width={1254}
        height={1254}
        className="h-full w-full object-contain dark:hidden"
      />
      <Image
        src={lightIconSrc}
        alt=""
        width={1280}
        height={1280}
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}

export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
  tone?: LogoTone;
}) {
  const wordmarkClass =
    "font-sans font-semibold tracking-[-0.03em] " +
    (wordmarkClassName ?? "text-xl");

  return (
    <span className={"inline-flex items-center " + (className ?? "")}>
      <span className="inline-flex items-center gap-3 dark:hidden">
        <LogoMark className="h-9 w-9 shrink-0" />
        <span className="h-6 w-px bg-light-grey" aria-hidden="true" />
        <span className={wordmarkClass}>
          <span className="text-charcoal">MyTrade</span>
          <span className="text-signal-orange">Box</span>
        </span>
      </span>
      <span className="hidden items-center gap-3 dark:inline-flex">
        <LogoMark className="h-9 w-9 shrink-0" tone="light" />
        <span className="h-6 w-px bg-white/20" aria-hidden="true" />
        <span className={wordmarkClass}>
          <span className="text-white">MyTrade</span>
          <span className="text-signal-orange">Box</span>
        </span>
      </span>
    </span>
  );
}
