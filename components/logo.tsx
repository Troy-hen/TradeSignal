import Image from "next/image";

type LogoTone = "dark" | "light";

const iconSrc = "/brand/mytradebox-icon.png";
const darkWordmarkSrc = "/brand/mytradebox-wordmark-dark.png";

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
        (tone === "light" ? "bg-white/10" : "bg-charcoal") +
        " " +
        (className ?? "")
      }
    >
      <Image
        src={iconSrc}
        alt=""
        width={1254}
        height={1254}
        className="h-full w-full object-contain"
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
          src={darkWordmarkSrc}
          alt="MyTradeBox"
          width={2048}
          height={682}
          priority
          className="h-9 w-auto object-contain"
        />
      </span>
    );
  }

  return (
    <span className={"inline-flex items-center gap-3 " + (className ?? "")}>
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
  );
}
