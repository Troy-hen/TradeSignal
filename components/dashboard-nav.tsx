"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "overview" },
  { href: "/opportunities", label: "Marketplace", icon: "opportunities" },
  { href: "/coverage", label: "Coverage", icon: "claimed" },
  { href: "/territories", label: "Map", icon: "territories" },
  { href: "/opportunities?action=saved", label: "Saved", icon: "saved", queryAction: "saved" },
  { href: "/crm", label: "CRM", icon: "crm" },
  { href: "/notifications", label: "Alerts", icon: "notifications" },
  { href: "/billing", label: "Billing", icon: "billing" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export function DashboardNav({ mobile = false, collapsed = false, notificationCount = 0, onNavigate }: { mobile?: boolean; collapsed?: boolean; notificationCount?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <nav className={mobile ? "flex min-w-max items-center gap-2 px-4 py-3" : "space-y-1 px-3 py-4"} aria-label="Workspace navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, searchParams.get("action"), item.href, "queryAction" in item ? item.queryAction : undefined);
        const showNotificationBadge = item.href === "/notifications" && notificationCount > 0;
        return (
          <Link key={item.label} href={item.href} title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined} onClick={onNavigate} className={mobile ? `inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? "border-signal-orange/20 bg-signal-orange/10 text-charcoal" : "border-light-grey bg-white text-slate hover:border-signal-orange/30 hover:text-charcoal"}` : `group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-signal-orange/10 text-charcoal" : "text-slate hover:bg-soft-surface hover:text-charcoal"}`}>
            <span className="relative shrink-0"><NavIcon name={item.icon} active={active} />{showNotificationBadge && collapsed && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal-orange px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">{notificationCount > 9 ? "9+" : notificationCount}</span>}</span>
            <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
            {showNotificationBadge && !collapsed ? <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-signal-orange px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{notificationCount > 99 ? "99+" : notificationCount}</span> : !mobile && !collapsed && active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal-orange" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function isActive(pathname: string, action: string | null, href: string, queryAction?: string): boolean {
  if (queryAction) return pathname === "/opportunities" && action === queryAction;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/opportunities") return pathname === "/opportunities" && action !== "saved";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const c = `h-[18px] w-[18px] shrink-0 ${active ? "text-signal-orange" : "text-slate/70"}`;
  if (name === "overview") return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>;
  if (name === "opportunities") return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>;
  if (name === "saved") return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z"/></svg>;
  if (name === "crm") return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path strokeLinecap="round" d="M8 8h8M8 12h5M8 16h3"/><circle cx="17" cy="15.5" r="2.25"/></svg>;
  if (name === "territories") return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-5.25 7-11a7 7 0 1 0-14 0c0 5.75 7 11 7 11Z"/><circle cx="12" cy="10" r="2.25"/></svg>;
  if (name === "notifications") return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 22h4"/></svg>;
  if (name === "claimed") return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z"/><path d="M5 5.5v16M9 7h6M9 11h6"/></svg>;
  if (name === "billing") return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>;
  return <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3.5 13.4 5l2-.2.8 1.8 1.8.8-.2 2L19.5 11 18 12.5l.2 2-1.8.8-.8 1.8-2-.2L12 18.5l-1.5-1.6-2 .2-.8-1.8-1.8-.8.2-2L4.5 11 6 9.5l-.2-2 1.8-.8.8-1.8 2 .2L12 3.5Z"/><circle cx="12" cy="11" r="2.5"/></svg>;
}
