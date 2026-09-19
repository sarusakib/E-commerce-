"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type OrderActionState = {
  error?: string;
};

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const ORDER_STATUSES = new Set<OrderStatus>([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
]);

const PAYMENT_STATUSES = new Set<PaymentStatus>([
  "unpaid",
  "pending",
  "paid",
  "failed",
  "partially_refunded",
  "refunded",
]);

function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.has(value as OrderStatus);
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return PAYMENT_STATUSES.has(value as PaymentStatus);
}

export async function updateOrderAction(
  _previous: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  "use server";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const orderId = String(formData.get("order_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const paymentStatus = String(formData.get("payment_status") ?? "").trim();
  const trackingNumber = String(formData.get("tracking_number") ?? "").trim();

  if (!orderId || !isOrderStatus(status) || !isPaymentStatus(paymentStatus)) {
    return { error: "Choose valid order and payment statuses." };
  }

  const { data: before } = await supabase
    .from("orders")
    .select("id,store_id,status,payment_status,tracking_number")
    .eq("id", orderId)
    .maybeSingle();

  if (!before) return { error: "Order not found or access is not allowed." };

  const { error } = await supabase
    .from("orders")
    .update({
      status,
      payment_status: paymentStatus,
      tracking_number: trackingNumber || null,
    })
    .eq("id", orderId);

  if (error) return { error: "Order could not be updated." };

  const changed = before.status !== status || before.payment_status !== paymentStatus || before.tracking_number !== (trackingNumber || null);

  if (changed) {
    await supabase.from("order_events").insert({
      store_id: before.store_id,
      order_id: before.id,
      event_type: "order.updated",
      payload: {
        previous_status: before.status,
        status,
        previous_payment_status: before.payment_status,
        payment_status: paymentStatus,
        tracking_number: trackingNumber || null,
        actor_user_id: auth.user.id,
      },
    });
  }

  redirect("/dashboard/orders/" + orderId + "?updated=1");
}
