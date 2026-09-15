export default function Loading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6 py-16" aria-busy="true" aria-live="polite">
      <div className="text-center">
        <span className="mx-auto flex h-10 w-10 animate-pulse items-center justify-center rounded-2xl bg-signal-orange/10 text-signal-orange" aria-hidden="true">
          ✦
        </span>
        <p className="mt-4 text-sm font-semibold text-charcoal">Loading your workspace…</p>
        <p className="mt-1 text-xs text-slate">Getting the latest local signal.</p>
      </div>
    </main>
  );
}
