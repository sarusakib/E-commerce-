"use client";

import { useActionState } from "react";
import { updateOrderAction } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const statusOptions: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
];

const paymentOptions: PaymentStatus[] = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "partially_refunded",
  "refunded",
];

type OrderActionState = { error?: string };

export default function OrderStatusForm({
  order,
}: {
  order: {
    id: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    tracking_number: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateOrderAction,
    {} satisfies OrderActionState,
  );

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="order_id" value={order.id} />

      <label>
        <span>Fulfillment status</span>
        <select name="status" defaultValue={order.status}>
          {statusOptions.map((status) => (
            <option value={status} key={status}>{status}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Payment status</span>
        <select name="payment_status" defaultValue={order.payment_status}>
          {paymentOptions.map((status) => (
            <option value={status} key={status}>{status.replace("_", " ")}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Tracking number</span>
        <input name="tracking_number" defaultValue={order.tracking_number ?? ""} maxLength={120} />
      </label>

      {state.error && <div className="alert error" role="alert">{state.error}</div>}

      <button className="button primary auth-submit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save order"}
      </button>
    </form>
  );
}
