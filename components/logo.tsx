import Image from "next/image";

type LogoTone = "dark" | "light";

const iconSrc = "/brand/mytradebox-icon.png";
const lightIconSrc = "/brand/mytradebox-icon-light.png";
const lightWordmarkSrc = "/brand/mytradebox-wordmark-light.png";

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
        (tone === "light" ? "bg-white/10" : "bg-[#1f2937]") +
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
  tone = "dark",
}: {
  className?: string;
  wordmarkClassName?: string;
  tone?: LogoTone;
}) {
  if (tone === "light") {
    return (
      <span className={"inline-flex items-center " + (className ?? "")}>
        <Image
          src={lightWordmarkSrc}
          alt="MyTradeBox"
          width={2048}
          height={682}
          priority
          className="h-12 w-auto object-contain"
        />
      </span>
    );
  }

  return (
    <span className={"inline-flex items-center " + (className ?? "")}>
      <span className="inline-flex items-center gap-3 dark:hidden">
        <LogoMark className="h-9 w-9 shrink-0" tone="dark" />
        <span className="h-6 w-px bg-light-grey" />
        <span
          className={
            "font-sans text-xl font-semibold tracking-[-0.03em] " +
            (wordmarkClassName ?? "text-charcoal")
          }
        >
          <span>MyTrade</span>
          <span className="text-signal-orange">Box</span>
        </span>
      </span>
      <Image
        src={lightWordmarkSrc}
        alt="MyTradeBox"
        width={2048}
        height={682}
        priority
        className="hidden h-12 w-auto object-contain dark:block"
      />
    </span>
  );
}
