import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-admin";
import { Logo } from "@/components/logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-soft-surface">
      <header className="border-b border-light-grey bg-charcoal">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo tone="light" />
            <span className="rounded bg-signal-orange px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
              Admin
            </span>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-white hover:text-signal-orange">
            Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
