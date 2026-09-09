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
  const fixedLightTone = tone === "light";
  const tileClass = fixedLightTone
    ? "border border-white/70 bg-[#f8fafc]"
    : "border border-[#e5e7eb] bg-[#f8fafc] dark:border-white/15 dark:bg-[#f8fafc]";

  return (
    <span
      className={
        "inline-flex items-center justify-center overflow-hidden rounded-xl " +
        tileClass +
        " " +
        (className ?? "")
      }
    >
      {fixedLightTone ? (
        <Image
          src={lightIconSrc}
          alt=""
          width={1280}
          height={1280}
          className="h-full w-full object-contain"
        />
      ) : (
        <>
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
  const wordmarkTone = fixedLightTone ? "text-white" : "text-[#1f2937] dark:text-white";
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
