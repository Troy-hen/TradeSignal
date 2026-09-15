export type ProductEventName =
  | "territory_previewed"
  | "notification_cta_clicked"
  | "checkout_started"
  | "checkout_completed";

export function trackProductEvent(
  eventName: ProductEventName,
  options: {
    source?: string;
    metadata?: Record<string, string | number | boolean | null>;
  } = {},
): void {
  if (typeof window === "undefined") return;

  void fetch("/api/product-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventName,
      route: window.location.pathname + window.location.search,
      source: options.source,
      metadata: options.metadata,
    }),
  }).catch(() => {
    // Product analytics must never interrupt the user's workflow.
  });
}
