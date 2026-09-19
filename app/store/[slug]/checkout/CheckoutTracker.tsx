'use client';

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function CheckoutTracker({ storeSlug }: { storeSlug: string }) {
  useEffect(() => {
    void trackEvent({
      storeSlug,
      eventName: "checkout_started",
    });
  }, [storeSlug]);

  return null;
}
