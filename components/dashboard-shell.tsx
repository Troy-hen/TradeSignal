"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { InAppNotificationFeed } from "@/components/in-app-notification-feed";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { InAppNotificationItem } from "@/lib/data/in-app-notifications";
import { signOut } from "@/lib/actions/auth";

type CompanySummary = { trading_name: string; role: string };

export function DashboardShell({ company, notifications, children }: { company: CompanySummary; notifications: InAppNotificationItem[]; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(notifications.length);
  const handleNotificationCount = useCallback((count: number) => setNotificationCount(count), []);

  const initials = company.trading_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("mytradebox-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDarkTheme = storedTheme === "dark" || (!storedTheme && prefersDark);
    document.documentElement.classList.toggle("dark", useDarkTheme);
    document.documentElement.style.colorScheme = useDarkTheme ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => setCollapsed(window.localStorage.getItem("mytradebox-sidebar") === "collapsed"));
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setCollapsed((current) => !current);
      }
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("keydown", handleShortcut); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("mytradebox-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-soft-surface">
      <aside className={"fixed inset-y-0 left-0 z-40 hidden border-r border-light-grey bg-white transition-[width] duration-200 lg:flex " + (collapsed ? "w-[76px]" : "w-[272px]")} aria-label="Workspace sidebar">
        <SidebarContent company={company} initials={initials || "MT"} collapsed={collapsed} notificationCount={notificationCount} onToggle={toggleSidebar} />
      </aside>

      {mobileOpen && <>
        <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-charcoal/40 lg:hidden" onClick={() => setMobileOpen(false)} />
        <aside className="fixed inset-y-0 left-0 z-50 flex w-[286px] max-w-[88vw] border-r border-light-grey bg-white shadow-xl lg:hidden" aria-label="Workspace navigation">
          <SidebarContent company={company} initials={initials || "MT"} collapsed={false} notificationCount={notificationCount} mobile onToggle={() => setMobileOpen(false)} />
        </aside>
      </>}

      <div className={"flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 " + (collapsed ? "lg:ml-[76px]" : "lg:ml-[272px]")}>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-light-grey bg-white/95 px-4 backdrop-blur lg:hidden">
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate transition hover:bg-soft-surface hover:text-charcoal" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><MenuIcon /></button>
          <Link href="/dashboard" aria-label="MyTradeBox overview" className="inline-flex h-9 w-9 items-center justify-center"><LogoMark className="h-9 w-9" /></Link>
        </header>
        <main className={"min-w-0 flex-1 overflow-x-hidden px-4 py-7 sm:px-6 lg:px-10 lg:py-10 " + (notificationCount > 0 ? "pb-36 md:pb-28" : "")}>
          <div className="mx-auto min-w-0 max-w-[1500px]">{children}</div>
        </main>
      </div>

      <InAppNotificationFeed items={notifications} sidebarCollapsed={collapsed} onCountChange={handleNotificationCount} />
    </div>
  );
}

function SidebarContent({ company, initials, collapsed, notificationCount, mobile = false, onToggle }: { company: CompanySummary; initials: string; collapsed: boolean; notificationCount: number; mobile?: boolean; onToggle: () => void }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className={"shrink-0 border-b border-light-grey px-4 py-5 " + (collapsed ? "flex flex-col items-center gap-4" : "flex items-center justify-between gap-3")}>
        <Link href="/dashboard" aria-label="MyTradeBox overview" onClick={mobile ? onToggle : undefined}>{collapsed ? <LogoMark className="h-9 w-9" /> : <Logo wordmarkClassName="text-xl" />}</Link>
        <button type="button" onClick={onToggle} aria-label={mobile ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={mobile ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate transition hover:bg-soft-surface hover:text-charcoal">
          {mobile ? <CloseIcon /> : <SidebarToggleIcon collapsed={collapsed} />}
        </button>
      </div>

      <div className={"shrink-0 border-b border-light-grey py-5 " + (collapsed ? "px-3" : "px-5")}>
        {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate">Workspace</p>}
        <div className={"mt-3 flex items-center " + (collapsed ? "justify-center" : "gap-3")}>
          <span title={collapsed ? company.trading_name : undefined} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal-orange/10 text-xs font-bold text-signal-orange">{initials}</span>
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold text-charcoal">{company.trading_name}</p><p className="mt-0.5 text-xs capitalize text-slate">{company.role}</p></div>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"><DashboardNav collapsed={collapsed} notificationCount={notificationCount} onNavigate={mobile ? onToggle : undefined} /></div>
      <div className={"shrink-0 border-t border-light-grey " + (collapsed ? "space-y-2 p-3" : "space-y-1 p-5")}>
        <ThemeToggle collapsed={collapsed} />
        <form action={signOut}><button type="submit" title={collapsed ? "Sign out" : undefined} className={"flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-slate transition hover:bg-soft-surface hover:text-charcoal " + (collapsed ? "justify-center px-2" : "justify-between px-3")}><span className={collapsed ? "sr-only" : undefined}>Sign out</span><span aria-hidden="true" className={collapsed ? undefined : "ml-auto"}>↗</span></button></form>
      </div>
    </div>
  );
}

function MenuIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>; }
function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
    <path d="M9 4v16" />
    {collapsed ? <path strokeLinecap="round" strokeLinejoin="round" d="m13 9 3 3-3 3" /> : <path strokeLinecap="round" strokeLinejoin="round" d="m16 9-3 3 3 3" />}
  </svg>;
}
