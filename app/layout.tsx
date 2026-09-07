import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TradeSignal — Know which local planning jobs to chase",
    template: "%s · TradeSignal",
  },
  description:
    "TradeSignal monitors UK planning applications, works out which projects fit your trade, estimates what the work could be worth and tells you when to act.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-soft-surface text-charcoal">
        {children}
      </body>
    </html>
  );
}
