"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: string; success?: string };

export async function createReviewAction(
  _previous: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = String(formData.get("store_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const rating = Number(formData.get("rating"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);

  if (!storeId || !productId || !slug) return { error: "Missing review context." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Rating must be between 1 and 5." };
  if (body.length < 5) return { error: "Write at least a few words about the product." };

  const { data: customers } = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("auth_user_id", auth.user.id);

  const customerIds = (customers ?? []).map((row) => row.id);
  if (!customerIds.length) return { error: "You need a completed order before reviewing this product." };

  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .eq("store_id", storeId)
    .in("customer_id", customerIds)
    .eq("status", "delivered")
    .order("created_at", { ascending: false })
    .limit(50);

  const orderIds = (orders ?? []).map((row) => row.id);
  if (!orderIds.length) return { error: "Reviews are available after delivery." };

  const { data: items } = await supabase
    .from("order_items")
    .select("order_id,customer_id")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .in("order_id", orderIds)
    .limit(20);

  const purchased = items?.[0];
  if (!purchased) return { error: "This product is not part of a delivered order on your account." };

  const customerId = purchased.customer_id
    ? purchased.customer_id
    : customerIds[0];

  const { error } = await supabase.from("product_reviews").insert({
    store_id: storeId,
    product_id: productId,
    customer_id: customerId,
    order_id: purchased.order_id,
    rating,
    title,
    body,
    verified_purchase: true,
    status: "pending",
  });

  if (error) {
    return {
      error: error.code === "23505"
        ? "You have already reviewed this product for that order."
        : "Your review could not be submitted.",
    };
  }

  redirect("/store/" + slug + "/products/" + formData.get("product_slug") + "?review=submitted");
}
