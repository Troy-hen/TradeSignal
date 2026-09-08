import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-soft-surface px-4 py-12">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-light-grey bg-white p-8 shadow-sm">
        {children}
      </div>
      <nav aria-label="Legal and support" className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate">
        <Link href="/privacy" className="hover:text-charcoal">Privacy</Link>
        <Link href="/terms" className="hover:text-charcoal">Terms</Link>
        <Link href="/contact" className="hover:text-charcoal">Contact</Link>
      </nav>
    </div>
  );
}
