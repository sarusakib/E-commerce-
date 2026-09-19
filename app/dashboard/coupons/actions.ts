import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CouponActionState } from "./types";
import type { Database } from "@/lib/supabase/database.types";

type CouponType = Database["public"]["Enums"]["coupon_type"];
const TYPES = new Set<CouponType>(["percentage", "fixed"]);

function isCouponType(value: string): value is CouponType {
  return TYPES.has(value as CouponType);
}

function read(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

function parseCoupon(formData: FormData) {
  const code = read(formData, "code", 40).toUpperCase();
  const rawType = read(formData, "type", 20);
  const type = rawType;
  const amount = Number(read(formData, "value", 30));
  const minSubtotal = Number(read(formData, "min_subtotal", 30) || 0);
  const maxText = read(formData, "max_discount", 30);
  const maxDiscount = maxText ? Number(maxText) : null;
  const usageText = read(formData, "usage_limit", 20);
  const usageLimit = usageText ? Number(usageText) : null;
  const perCustomer = Number(read(formData, "per_customer_limit", 20) || 1);
  const startsText = read(formData, "starts_at", 40);
  const endsText = read(formData, "ends_at", 40);
  const active = formData.get("active") === "on";

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { error: "Coupon code must be 3–40 letters, numbers, hyphens or underscores." };
  if (!isCouponType(type)) return { error: "Choose a valid coupon type." };
  if (!Number.isFinite(amount) || amount <= 0 || (type === "percentage" && amount > 100)) return { error: "Coupon value is invalid." };
  if (!Number.isFinite(minSubtotal) || minSubtotal < 0) return { error: "Minimum subtotal is invalid." };
  if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) return { error: "Maximum discount is invalid." };
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) return { error: "Usage limit is invalid." };
  if (!Number.isInteger(perCustomer) || perCustomer < 1) return { error: "Per-customer limit is invalid." };

  let startsAt: string | null = null;
  let endsAt: string | null = null;

  if (startsText) {
    const d = new Date(startsText);
    if (Number.isNaN(d.getTime())) return { error: "Start time is invalid." };
    startsAt = d.toISOString();
  }

  if (endsText) {
    const d = new Date(endsText);
    if (Number.isNaN(d.getTime())) return { error: "End time is invalid." };
    endsAt = d.toISOString();
  }

  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { error: "End time must be after start time." };
  }

  return {
    value: {
      code,
      type,
      value: amount,
      min_subtotal: minSubtotal,
      max_discount: maxDiscount,
      starts_at: startsAt,
      ends_at: endsAt,
      usage_limit: usageLimit,
      per_customer_limit: perCustomer,
      active,
    },
  };
}

export async function createCouponAction(_previous: CouponActionState, formData: FormData): Promise<CouponActionState> {
  "use server";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = read(formData, "store_id", 64);
  const parsed = parseCoupon(formData);
  if (!storeId) return { error: "Select a store." };
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase.from("coupons").insert({ store_id: storeId, ...parsed.value });
  if (error) return { error: error.code === "23505" ? "That coupon code already exists." : "Could not create coupon." };

  revalidatePath("/dashboard/coupons");
  return { success: "Coupon created." };
}

export async function updateCouponAction(_previous: CouponActionState, formData: FormData): Promise<CouponActionState> {
  "use server";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const couponId = read(formData, "coupon_id", 64);
  const storeId = read(formData, "store_id", 64);
  const parsed = parseCoupon(formData);
  if (!couponId || !storeId) return { error: "Missing coupon or store." };
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase.from("coupons").update(parsed.value).eq("id", couponId).eq("store_id", storeId);
  if (error) return { error: error.code === "23505" ? "That coupon code already exists." : "Could not update coupon." };

  revalidatePath("/dashboard/coupons");
  return { success: "Coupon updated." };
}

export async function deleteCouponAction(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const couponId = read(formData, "coupon_id", 64);
  const storeId = read(formData, "store_id", 64);
  if (!couponId || !storeId) return;

  await supabase.from("coupons").delete().eq("id", couponId).eq("store_id", storeId);
  revalidatePath("/dashboard/coupons");
}
