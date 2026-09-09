"use client";

import { useEffect, useState } from "react";

export type NotificationInboxRow = {
  id: string;
  notification_type: string;
  status: string;
  subject: string | null;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  email_html: string | null;
};

export function NotificationInbox({ notifications }: { notifications: NotificationInboxRow[] }) {
  const [selected, setSelected] = useState<NotificationInboxRow | null>(null);

  useEffect(() => {
    if (!selected) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-light-grey bg-soft-surface p-5 text-sm text-slate">
        No notification emails have been attempted yet. New opportunity and account alerts will appear here after delivery is attempted.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-light-grey">
        <ul className="divide-y divide-light-grey">
          {notifications.map((notification) => {
            const status = notificationStatus(notification.status);
            const subject = notification.subject ?? notificationLabel(notification.notification_type);

            return (
              <li key={notification.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-soft-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal-orange sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => setSelected(notification)}
                  aria-label={`View email: ${subject}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-charcoal">{subject}</span>
                    <span className="mt-1 block text-xs text-slate">
                      {notificationLabel(notification.notification_type)} · {formatDateTime(notification.sent_at ?? notification.created_at)}
                    </span>
                    {notification.error_message && <span className="mt-1 block text-xs text-danger">{notification.error_message}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-semibold text-signal-orange">View email →</span>
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-email-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-light-grey bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-light-grey p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Email delivery</p>
                <h2 id="notification-email-title" className="mt-2 truncate text-lg font-bold tracking-tight text-charcoal sm:text-xl">
                  {selected.subject ?? notificationLabel(selected.notification_type)}
                </h2>
                <p className="mt-1 text-xs text-slate">{formatDateTime(selected.sent_at ?? selected.created_at)}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-light-grey px-3 py-2 text-sm font-semibold text-slate transition hover:border-charcoal hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-orange"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
            {selected.email_html ? (
              <iframe
                title={selected.subject ?? "Email content"}
                srcDoc={selected.email_html}
                sandbox=""
                className="h-[min(70vh,640px)] w-full bg-white"
              />
            ) : (
              <div className="m-5 rounded-2xl border border-dashed border-light-grey bg-soft-surface p-6 text-sm leading-6 text-slate sm:m-6">
                This historical event was logged before MyTradeBox retained email content, so its message is not available to preview.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function notificationLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function notificationStatus(status: string): { label: string; className: string; dot: string } {
  if (status === "sent") return { label: "Sent", className: "bg-success/10 text-success", dot: "bg-success" };
  if (status === "queued") return { label: "Queued", className: "bg-warning/10 text-warning", dot: "bg-warning" };
  return { label: "Failed", className: "bg-danger/10 text-danger", dot: "bg-danger" };
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
