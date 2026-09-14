"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { PublicThemeGuard } from "@/components/public-theme-guard";

function currentYear(): number {
  return new Date().getFullYear();
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <PublicThemeGuard />
      <div className="flex min-h-screen flex-col overflow-x-clip">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-charcoal">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <Link href="/" aria-label="Everro home" className="min-w-0 shrink">
              <Logo tone="light" />
            </Link>

            <nav aria-label="Primary navigation" className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-6">
              <div className="hidden items-center gap-5 md:flex">
                <Link href="/#how-it-works" className="text-sm font-medium text-white/70 transition hover:text-white">
                  How it works
                </Link>
                <Link href="/pricing" className="text-sm font-medium text-white/70 transition hover:text-white">
                  Pricing
                </Link>
                <Link href="/faq" className="text-sm font-medium text-white/70 transition hover:text-white">
                  FAQ
                </Link>
              </div>
              <Link
                href="/login"
                className="hidden text-sm font-semibold text-white/80 transition hover:text-white md:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden items-center rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e95f00] sm:inline-flex"
              >
                Create your account
              </Link>

              <div className="relative md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileOpen((open) => !open)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white transition hover:border-white/30 hover:bg-white/10"
                  aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                  aria-expanded={mobileOpen}
                >
                  <svg viewBox="0 0 24 24" className={mobileOpen ? "hidden h-5 w-5" : "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                  <svg viewBox="0 0 24 24" className={mobileOpen ? "h-5 w-5" : "hidden h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
                {mobileOpen && <div className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-charcoal shadow-2xl shadow-black/30">
                  <div className="grid p-2">
                    <MobileNavLink href="/#how-it-works" onClick={() => setMobileOpen(false)}>How it works</MobileNavLink>
                    <MobileNavLink href="/pricing" onClick={() => setMobileOpen(false)}>Pricing</MobileNavLink>
                    <MobileNavLink href="/faq" onClick={() => setMobileOpen(false)}>FAQ</MobileNavLink>
                    <MobileNavLink href="/contact" onClick={() => setMobileOpen(false)}>Contact</MobileNavLink>
                    <MobileNavLink href="/login" onClick={() => setMobileOpen(false)}>Log in</MobileNavLink>
                  </div>
                  <div className="border-t border-white/10 p-3">
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center justify-center rounded-xl bg-signal-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e95f00]"
                    >
                      Create your account
                    </Link>
                  </div>
                </div>}
              </div>
            </nav>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>

        <footer className="bg-charcoal text-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Logo tone="light" />
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
                  B2B buying intelligence that helps suppliers find businesses entering a buying window.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:text-right">
                <Link href="/pricing" className="text-white/60 transition hover:text-white">Pricing</Link>
                <Link href="/faq" className="text-white/60 transition hover:text-white">FAQ</Link>
                <Link href="/contact" className="text-white/60 transition hover:text-white">Contact</Link>
                <Link href="/privacy" className="text-white/60 transition hover:text-white">Privacy</Link>
                <Link href="/terms" className="text-white/60 transition hover:text-white">Terms</Link>
                <Link href="/login" className="text-white/60 transition hover:text-white">Log in</Link>
              </div>
            </div>
            <div className="mt-10 border-t border-white/10 pt-5 text-sm text-white/50 sm:flex sm:items-center sm:justify-between">
              <p>Built for UK B2B suppliers.</p>
              <p className="mt-2 sm:mt-0">© {currentYear()} Everro. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-xl px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}
