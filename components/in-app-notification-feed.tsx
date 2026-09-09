"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { InAppNotificationItem } from "@/lib/data/in-app-notifications";
import { trackProductEvent } from "@/lib/analytics/client";

const STORAGE_KEY = "mytradebox-dismissed-in-app-notifications";

export function InAppNotificationFeed({
  items,
  sidebarCollapsed,
  onCountChange,
}: {
  items: InAppNotificationItem[];
  sidebarCollapsed: boolean;
  onCountChange: (count: number) => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setDismissed(parsed.filter((value) => typeof value === "string"));
    } catch {
      // Ignore malformed local storage and start fresh.
    }
  }, []);

  const activeItems = useMemo(() => items.filter((item) => !dismissed.includes(item.id)), [dismissed, items]);

  useEffect(() => {
    onCountChange(activeItems.length);
    if (index >= activeItems.length) setIndex(Math.max(0, activeItems.length - 1));
  }, [activeItems.length, index, onCountChange]);

  if (activeItems.length === 0) return null;

  const current = activeItems[index] ?? activeItems[0];
  const tone = toneClasses(current.tone);

  function dismissCurrent() {
    const nextDismissed = [...dismissed, current.id].slice(-100);
    setDismissed(nextDismissed);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDismissed));
    } catch {
      // UI dismissal still works for the current session.
    }
    if (index >= activeItems.length - 1) setIndex(Math.max(0, index - 1));
  }

  function previous() {
    setIndex((currentIndex) => (currentIndex <= 0 ? activeItems.length - 1 : currentIndex - 1));
  }

  function next() {
    setIndex((currentIndex) => (currentIndex >= activeItems.length - 1 ? 0 : currentIndex + 1));
  }

  return (
    <div
      className={[
        "fixed bottom-0 right-0 z-40 border-t border-light-grey bg-white/98 shadow-[0_-12px_35px_rgba(31,41,55,0.12)] backdrop-blur",
        sidebarCollapsed ? "left-0 lg:left-[76px]" : "left-0 lg:left-[272px]",
      ].join(" ")}
      aria-live="polite"
    >
      <div className="mx-auto flex min-h-[72px] max-w-[1500px] min-w-0 flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center lg:px-10">
        <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
          <span className={["mt-1 h-2.5 w-2.5 shrink-0 rounded-full md:mt-0", tone.dot].join(" ")} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className={["text-[10px] font-bold uppercase tracking-[0.13em]", tone.label].join(" ")}>{current.eyebrow}</span>
              {activeItems.length > 1 && <span className="text-[10px] font-semibold text-slate/60">{index + 1} of {activeItems.length}</span>}
            </div>
            <p className="mt-1 break-words text-sm font-semibold leading-5 text-charcoal">{current.title}</p>
            {current.detail && <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-slate md:line-clamp-1">{current.detail}</p>}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-5 md:pl-0">
          {activeItems.length > 1 && (
            <div className="flex items-center overflow-hidden rounded-xl border border-light-grey bg-white">
              <FeedIconButton label="Previous notification" onClick={previous} direction="left" />
              <FeedIconButton label="Next notification" onClick={next} direction="right" />
            </div>
          )}
          <button type="button" onClick={dismissCurrent} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate transition hover:bg-soft-surface hover:text-charcoal">Dismiss</button>
          <Link
            href={current.href}
            onClick={() => trackProductEvent("notification_cta_clicked", {
              source: "in_app_feed",
              metadata: { notification_id: current.id, notification_type: current.eyebrow, destination: current.href },
            })}
            className="inline-flex items-center justify-center rounded-xl bg-charcoal px-4 py-2 text-xs font-semibold text-white transition hover:bg-signal-orange"
          >
            {current.ctaLabel} <span className="ml-1.5" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeedIconButton({ label, onClick, direction }: { label: string; onClick: () => void; direction: "left" | "right" }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center text-slate transition hover:bg-soft-surface hover:text-charcoal first:border-r first:border-light-grey">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {direction === "left" ? <path strokeLinecap="round" strokeLinejoin="round" d="m14 6-6 6 6 6" /> : <path strokeLinecap="round" strokeLinejoin="round" d="m10 6 6 6-6 6" />}
      </svg>
    </button>
  );
}

function toneClasses(tone: InAppNotificationItem["tone"]): { dot: string; label: string } {
  if (tone === "success") return { dot: "bg-success", label: "text-success" };
  if (tone === "warning") return { dot: "bg-warning", label: "text-warning" };
  if (tone === "info") return { dot: "bg-slate", label: "text-slate" };
  return { dot: "bg-signal-orange", label: "text-signal-orange" };
}
