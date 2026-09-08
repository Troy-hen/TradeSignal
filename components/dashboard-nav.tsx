"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/opportunities", label: "Opportunities", icon: "opportunities" },
  { href: "/territories", label: "Territory Explorer", icon: "territories" },
  { href: "/coverage", label: "Coverage", icon: "claimed" },
  { href: "/roi", label: "ROI", icon: "roi" },
  { href: "/billing", label: "Billing", icon: "billing" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export function DashboardNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={mobile ? "flex min-w-max items-center gap-2 px-4 py-3" : "space-y-1 px-3 py-4"} aria-label="Workspace navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              mobile
                ? `inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "border-signal-orange/20 bg-signal-orange/10 text-charcoal"
                      : "border-light-grey bg-white text-slate hover:border-signal-orange/30 hover:text-charcoal"
                  }`
                : `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-signal-orange/10 text-charcoal" : "text-slate hover:bg-soft-surface hover:text-charcoal"
                  }`
            }
          >
            <NavIcon name={item.icon} active={active} />
            <span>{item.label}</span>
            {!mobile && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal-orange" />}
          </Link>
        );
      })}
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const className = `h-[18px] w-[18px] shrink-0 ${active ? "text-signal-orange" : "text-slate/70"}`;

  if (name === "overview") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    );
  }

  if (name === "opportunities") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
      </svg>
    );
  }

  if (name === "territories") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.25" />
      </svg>
    );
  }

  if (name === "claimed") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5v16M9 7h6M9 11h6" />
      </svg>
    );
  }

  if (name === "roi") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M4 19h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m7 15 3-3 3 2 5-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 8h3v3" />
      </svg>
    );
  }

  if (name === "billing") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path strokeLinecap="round" d="M3 10h18M7 15h3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 13.4 5l2-.2.8 1.8 1.8.8-.2 2L19.5 11 18 12.5l.2 2-1.8.8-.8 1.8-2-.2L12 18.5l-1.5-1.6-2 .2-.8-1.8-1.8-.8.2-2L4.5 11 6 9.5l-.2-2 1.8-.8.8-1.8 2 .2L12 3.5Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}
