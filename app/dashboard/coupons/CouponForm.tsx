'use client';

import { useActionState } from "react";
import type { CouponActionState } from "./types";

type Coupon = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number | string;
  min_subtotal: number | string;
  max_discount: number | string | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number;
  active: boolean;
};

type Action = (state: CouponActionState, formData: FormData) => Promise<CouponActionState>;

function localDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export default function CouponForm({
  storeId,
  coupon,
  action,
}: {
  storeId: string;
  coupon?: Coupon;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="coupon-form">
      <input type="hidden" name="store_id" value={storeId} />
      {coupon?.id && <input type="hidden" name="coupon_id" value={coupon.id} />}

      <div className="form-grid">
        <label><span>Code</span><input name="code" defaultValue={coupon?.code ?? ""} placeholder="WELCOME10" maxLength={40} required /></label>
        <label><span>Type</span><select name="type" defaultValue={coupon?.type ?? "percentage"}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
        <label><span>Value</span><input name="value" type="number" min="0.01" step="0.01" defaultValue={coupon?.value ?? ""} required /></label>
        <label><span>Minimum subtotal</span><input name="min_subtotal" type="number" min="0" step="0.01" defaultValue={coupon?.min_subtotal ?? 0} /></label>
        <label><span>Maximum discount</span><input name="max_discount" type="number" min="0" step="0.01" defaultValue={coupon?.max_discount ?? ""} /></label>
        <label><span>Usage limit</span><input name="usage_limit" type="number" min="1" step="1" defaultValue={coupon?.usage_limit ?? ""} /></label>
        <label><span>Per customer</span><input name="per_customer_limit" type="number" min="1" step="1" defaultValue={coupon?.per_customer_limit ?? 1} required /></label>
        <label><span>Starts</span><input name="starts_at" type="datetime-local" defaultValue={localDate(coupon?.starts_at ?? null)} /></label>
        <label><span>Ends</span><input name="ends_at" type="datetime-local" defaultValue={localDate(coupon?.ends_at ?? null)} /></label>
      </div>

      <label className="check-row">
        <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} />
        <span>Coupon is active</span>
      </label>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}
      {state.success && <div className="alert success" role="status">{state.success}</div>}

      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : coupon ? "Save coupon" : "Create coupon"}
      </button>
    </form>
  );
}
