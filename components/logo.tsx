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

  return (
    <span
      className={
        "inline-flex items-center justify-center overflow-hidden rounded-xl " +
        (fixedLightTone ? "bg-[#f8fafc]" : "bg-[#1f2937] dark:bg-[#f8fafc]") +
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
    "font-sans font-semibold tracking-[-0.03em] " +
    (wordmarkClassName ?? "text-xl");

  return (
    <span className={"inline-flex items-center gap-3 " + (className ?? "")}>
      <LogoMark className="h-9 w-9 shrink-0" tone={tone} />
      <span
        className={
          "h-6 w-px " +
          (fixedLightTone ? "bg-white/30" : "bg-light-grey dark:bg-white/30")
        }
        aria-hidden="true"
      />
      <span className={wordmarkClass}>
        <span className={fixedLightTone ? "text-white" : "text-charcoal dark:text-white"}>
          MyTrade
        </span>
        <span className="text-signal-orange">Box</span>
      </span>
    </span>
  );
}
