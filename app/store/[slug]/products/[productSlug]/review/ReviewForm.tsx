'use client';

import { useActionState } from "react";
import type { ReviewState } from "./actions";
import { createReviewAction } from "./actions";

export default function ReviewForm({
  storeId,
  productId,
  slug,
  productSlug,
}: {
  storeId: string;
  productId: string;
  slug: string;
  productSlug: string;
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(createReviewAction, {});

  return (
    <form action={action} className="store-form review-form">
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="product_slug" value={productSlug} />

      <div className="form-section-title">Leave a verified review</div>
      <div className="form-grid">
        <label>
          <span>Rating</span>
          <select name="rating" defaultValue="5">
            <option value="5">5 — Excellent</option>
            <option value="4">4 — Good</option>
            <option value="3">3 — Average</option>
            <option value="2">2 — Poor</option>
            <option value="1">1 — Very poor</option>
          </select>
        </label>
        <label>
          <span>Review title</span>
          <input name="title" maxLength={120} placeholder="Great quality" />
        </label>
      </div>

      <label>
        <span>Your review</span>
        <textarea name="body" rows={6} maxLength={4000} required placeholder="Share your experience…" />
      </label>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {state.success && <div className="alert success" role="status">{state.success}</div>}

      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
