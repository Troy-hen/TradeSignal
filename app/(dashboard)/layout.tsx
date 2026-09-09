import Link from "next/link";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { getInAppNotifications } from "@/lib/data/in-app-notifications";
import { Logo } from "@/components/logo";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const company = await getCurrentCompany();

  if (!company) {
    return <PublicShell>{children}</PublicShell>;
  }

  const inAppNotifications = await getInAppNotifications(company.id);

  return (
    <DashboardShell
      company={{
        trading_name: company.trading_name,
        role: company.role,
      }}
      notifications={inAppNotifications}
    >
      {children}
    </DashboardShell>
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
