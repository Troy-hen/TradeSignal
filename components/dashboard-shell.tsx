"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/actions/auth";

type CompanySummary = {
  trading_name: string;
  role: string;
};

export function DashboardShell({
  company,
  children,
}: {
  company: CompanySummary;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = company.trading_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("mytradebox-sidebar") === "collapsed");

    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setCollapsed((current) => !current);
      }

      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("mytradebox-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-soft-surface">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-light-grey bg-white transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[76px]" : "w-[272px]"
        }`}
        aria-label="Workspace sidebar"
      >
        <SidebarContent
          company={company}
          initials={initials || "MT"}
          collapsed={collapsed}
          onToggle={toggleSidebar}
        />
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-charcoal/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-[286px] max-w-[88vw] border-r border-light-grey bg-white shadow-xl lg:hidden"
            aria-label="Workspace navigation"
          >
            <SidebarContent
              company={company}
              initials={initials || "MT"}
              collapsed={false}
              mobile
              onToggle={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-light-grey bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate transition hover:bg-soft-surface hover:text-charcoal"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </button>
          <Link href="/dashboard" aria-label="MyTradeBox overview">
            <Logo wordmarkClassName="text-base" />
          </Link>
          <span className="h-9 w-9" aria-hidden="true" />
        </header>

        <main className="flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  company,
  initials,
  collapsed,
  mobile = false,
  onToggle,
}: {
  company: CompanySummary;
  initials: string;
  collapsed: boolean;
  mobile?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className={`border-b border-light-grey px-4 py-5 ${
        collapsed ? "flex flex-col items-center gap-4" : "flex items-center justify-between gap-3"
      }`}>
        <Link href="/dashboard" aria-label="MyTradeBox overview" onClick={mobile ? onToggle : undefined}>
          {collapsed ? (
            <LogoMark className="h-9 w-9" />
          ) : (
            <Logo wordmarkClassName="text-lg" />
          )}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={mobile ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={mobile ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate transition hover:bg-soft-surface hover:text-charcoal"
        >
          {mobile ? <CloseIcon /> : <ChevronIcon collapsed={collapsed} />}
        </button>
        {!collapsed && (
          <p className="absolute left-[-9999px] h-px w-px overflow-hidden">
            Use Ctrl/Cmd + \\ to toggle the sidebar.
          </p>
        )}
      </div>

      <div className={`border-b border-light-grey py-5 ${
        collapsed ? "px-3" : "px-5"
      }`}>
        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate">
            Workspace
          </p>
        )}
        <div className={`mt-3 flex items-center ${
          collapsed ? "justify-center" : "gap-3"
        }`}>
          <span
            title={collapsed ? company.trading_name : undefined}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal-orange/10 text-xs font-bold text-signal-orange"
          >
            {initials}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-charcoal">{company.trading_name}</p>
              <p className="mt-0.5 text-xs capitalize text-slate">{company.role}</p>
            </div>
          )}
        </div>
      </div>

      <DashboardNav collapsed={collapsed} />

      <div className={`mt-auto border-t border-light-grey ${
        collapsed ? "space-y-2 p-3" : "space-y-1 p-5"
      }`}>
        <ThemeToggle collapsed={collapsed} />
        <form action={signOut}>
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-slate transition hover:bg-soft-surface hover:text-charcoal ${
              collapsed ? "justify-center px-2" : "justify-between px-3"
            }`}
          >
            <span className={collapsed ? "sr-only" : undefined}>Sign out</span>
            <span aria-hidden="true" className={collapsed ? undefined : "ml-auto"}>↗</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {collapsed ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 5-7 7 7 7" />
      )}
    </svg>
  );
}
