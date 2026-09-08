import Link from "next/link";
import { Logo } from "@/components/logo";

function currentYear(): number {
  return new Date().getFullYear();
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-light-grey bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-charcoal hover:text-signal-orange">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-signal-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Sign up free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-light-grey bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate">
          <p>© {currentYear()} TradeSignal. UK planning opportunity intelligence for trade businesses.</p>
        </div>
      </footer>
    </div>
  );
}
