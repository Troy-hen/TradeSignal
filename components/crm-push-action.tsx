import Link from "next/link";

export function CrmPushAction({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/settings#crm-connections"
      title="Connect or choose your CRM in Settings"
      className={compact
        ? "inline-flex items-center justify-center rounded-xl border border-light-grey bg-white px-3 py-2 text-xs font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange"
        : "inline-flex items-center justify-center rounded-xl border border-light-grey bg-white px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:border-signal-orange/40 hover:text-signal-orange"}
    >
      Push to CRM <span className="ml-2" aria-hidden="true">↗</span>
    </Link>
  );
}
