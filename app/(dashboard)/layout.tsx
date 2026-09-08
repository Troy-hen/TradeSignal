import Link from "next/link";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { Logo } from "@/components/logo";
import { DashboardNav } from "@/components/dashboard-nav";
import { signOut } from "@/lib/actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const company = await getCurrentCompany();

  if (!company) {
    return <PublicShell>{children}</PublicShell>;
  }

  const initials = company.trading_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-soft-surface">
      <aside className="hidden w-[272px] shrink-0 border-r border-light-grey bg-white lg:block">
        <div className="flex min-h-screen flex-col">
          <div className="border-b border-light-grey px-6 py-6">
            <Link href="/dashboard" aria-label="MyTradeBox overview">
              <Logo wordmarkClassName="text-lg" />
            </Link>
            <p className="mt-4 text-xs font-medium text-slate">Planning intelligence for trades</p>
          </div>

          <div className="border-b border-light-grey px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate">Workspace</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-orange/10 text-xs font-bold text-signal-orange">
                {initials || "MT"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">{company.trading_name}</p>
                <p className="mt-0.5 text-xs capitalize text-slate">{company.role}</p>
              </div>
            </div>
          </div>

          <DashboardNav />

          <div className="mt-auto border-t border-light-grey p-5">
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate transition hover:bg-soft-surface hover:text-charcoal"
              >
                Sign out
                <span aria-hidden="true">↗</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-light-grey bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
            <div className="lg:hidden">
              <Link href="/dashboard" aria-label="MyTradeBox overview">
                <Logo wordmarkClassName="text-base" />
              </Link>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-charcoal">MyTradeBox workspace</p>
              <p className="mt-0.5 text-xs text-slate">Focus on the jobs worth chasing.</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-charcoal">{company.trading_name}</p>
                <p className="mt-0.5 text-[11px] capitalize text-slate">{company.role}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal text-xs font-bold text-white">
                {initials || "MT"}
              </span>
              <form action={signOut}>
                <button type="submit" className="hidden text-xs font-semibold text-slate transition hover:text-charcoal sm:inline-flex">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="overflow-x-auto border-b border-light-grey bg-white lg:hidden">
          <DashboardNav mobile />
        </div>

        <main className="flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-soft-surface">
      <header className="border-b border-light-grey bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="MyTradeBox home">
            <Logo wordmarkClassName="text-lg" />
          </Link>
          <nav className="flex items-center gap-3" aria-label="Account">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate transition hover:text-charcoal">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-xl bg-signal-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95f00]">
              Create free account
            </Link>
          </nav>
        </div>
      </header>
      <main className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
