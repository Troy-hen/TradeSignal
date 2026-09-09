import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/require-admin";
import { Logo } from "@/components/logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return (
    <div className="min-h-screen overflow-x-hidden bg-soft-surface">
      <header className="border-b border-light-grey bg-charcoal">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3"><Logo tone="light" /><span className="rounded bg-signal-orange px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Admin</span></div>
          <Link href="/dashboard" className="shrink-0 text-sm font-medium text-white hover:text-signal-orange">Back to app</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] min-w-0 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
