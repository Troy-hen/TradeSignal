import Link from "next/link";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { Logo } from "@/components/logo";
import { signOut } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/territories", label: "Territory Explorer" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/my-territories", label: "My Territories" },
  { href: "/roi", label: "ROI" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const company = await requireCurrentCompany();

  return (
    <div className="flex min-h-screen bg-soft-surface">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-light-grey bg-white md:flex">
        <div className="border-b border-light-grey px-5 py-5">
          <Logo wordmarkClassName="text-lg" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-charcoal hover:bg-soft-surface"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-light-grey p-4">
          <p className="truncate text-sm font-medium text-charcoal">{company.trading_name}</p>
          <p className="mb-3 text-xs capitalize text-slate">{company.role}</p>
          <form action={signOut}>
            <button type="submit" className="text-xs font-medium text-slate hover:text-charcoal">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-light-grey bg-white px-4 py-3 md:hidden">
          <Logo wordmarkClassName="text-base" />
          <form action={signOut}>
            <button type="submit" className="text-xs font-medium text-slate">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
