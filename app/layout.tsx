import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const themeInitScript = `try {
  var storedTheme = window.localStorage.getItem("mytradebox-theme");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (storedTheme === "dark" || (!storedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
} catch (_) {}
`;

export const metadata: Metadata = {
  title: {
    default: "MyTradeBox — Find the local jobs worth chasing",
    template: "%s · MyTradeBox",
  },
  description:
    "MyTradeBox turns UK planning applications into qualified local opportunities for trade businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.variable + " h-full antialiased"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-soft-surface text-charcoal font-sans">
        {children}
      </body>
    </html>
  );
}
