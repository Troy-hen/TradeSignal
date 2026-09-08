import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TradeSignal — Find the local jobs worth chasing",
    template: "%s · TradeSignal",
  },
  description:
    "TradeSignal turns UK planning applications into qualified local opportunities for trade businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={sora.variable + " h-full antialiased"}>
      <body className="min-h-full flex flex-col bg-soft-surface text-charcoal font-sans">
        {children}
      </body>
    </html>
  );
}
