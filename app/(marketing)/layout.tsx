import Link from "next/link";
import { Logo } from "@/components/logo";

function currentYear(): number {
  return new Date().getFullYear();
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-charcoal">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:py-5 lg:px-8">
          <Link href="/" aria-label="MyTradeBox home">
            <Logo tone="light" />
          </Link>

          <nav aria-label="Primary navigation" className="flex items-center gap-3 sm:gap-6">
            <div className="hidden items-center gap-6 md:flex">
              <Link
                href="/#how-it-works"
                className="text-sm font-medium text-white/70 transition hover:text-white"
              >
                How it works
              </Link>
            </div>
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-white/80 transition hover:text-white sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e95f00]"
            >
              Create your account
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-charcoal text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Logo tone="light" />
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
                Planning intelligence that helps trade businesses find the local jobs worth chasing.
              </p>
            </div>
            <div className="text-left text-sm text-white/50 sm:text-right">
              <p>Built for UK trade businesses.</p>
              <p className="mt-2">© {currentYear()} MyTradeBox. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
