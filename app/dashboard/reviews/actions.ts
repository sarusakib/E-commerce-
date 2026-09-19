"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function moderateReviewAction(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const reviewId = String(formData.get("review_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const response = String(formData.get("seller_response") ?? "").trim().slice(0, 2000);
  if (!reviewId || !["pending","published","rejected","hidden"].includes(status)) return;

  const { data: review } = await supabase
    .from("product_reviews")
    .select("id,store_id,product_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (!review) return;

  const { error } = await supabase
    .from("product_reviews")
    .update({ status, seller_response: response || null })
    .eq("id", reviewId)
    .eq("store_id", review.store_id);

  if (!error) {
    revalidatePath("/dashboard/reviews");
    revalidatePath("/store/" + formData.get("store_slug") + "/products/" + formData.get("product_slug"));
  }
}
