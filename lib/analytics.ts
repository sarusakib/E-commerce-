import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "ecommerce-premium:analytics-session";

export function getAnalyticsSessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing && /^[a-zA-Z0-9_-]{16,120}$/.test(existing)) return existing;
    const id = crypto.randomUUID().replaceAll("-", "");
    window.localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID().replaceAll("-", "");
  }
}

export async function trackEvent(input: {
  storeSlug: string;
  eventName: "product_view" | "add_to_cart" | "checkout_started" | "purchase" | "search" | "wishlist_add" | "review_view";
  path?: string;
  productId?: string;
  orderId?: string;
  value?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createClient();
    await supabase.functions.invoke("track-event", {
      body: {
        store_slug: input.storeSlug,
        event_name: input.eventName,
        session_id: getAnalyticsSessionId(),
        path: input.path ?? window.location.pathname,
        product_id: input.productId ?? null,
        order_id: input.orderId ?? null,
        value: input.value ?? null,
        currency: input.currency ?? null,
        metadata: input.metadata ?? {},
      },
    });
  } catch {
    // Analytics must never block commerce interactions.
  }
}
