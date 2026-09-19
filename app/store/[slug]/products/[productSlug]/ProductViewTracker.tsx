'use client';

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function ProductViewTracker({
  storeSlug,
  productId,
}: {
  storeSlug: string;
  productId: string;
}) {
  useEffect(() => {
    void trackEvent({
      storeSlug,
      productId,
      eventName: "product_view",
    });
  }, [productId, storeSlug]);

  return null;
}
