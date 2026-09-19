"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import type { ProductActionState } from "./types";
import type { Database } from "@/lib/supabase/database.types";

type ProductStatus = Database["public"]["Enums"]["product_status"];
const PRODUCT_STATUSES = new Set<ProductStatus>(["draft", "active", "archived"]);

function isProductStatus(value: string): value is ProductStatus {
  return PRODUCT_STATUSES.has(value as ProductStatus);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function readProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const slug = rawSlug || slugify(name);
  const description = String(formData.get("description") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
  const priceText = String(formData.get("price") ?? "").trim();
  const compareText = String(formData.get("compare_at_price") ?? "").trim();
  const stockText = String(formData.get("stock") ?? "0").trim();
  const status = String(formData.get("status") ?? "draft").trim();
  const featured = formData.get("featured") === "on";
  const seoTitle = String(formData.get("seo_title") ?? "").trim();
  const seoDescription = String(formData.get("seo_description") ?? "").trim();

  const price = Number(priceText);
  const compareAtPrice = compareText ? Number(compareText) : null;
  const stock = Number(stockText);

  if (name.length < 2 || name.length > 180) {
    return { error: "Product name must be between 2 and 180 characters." };
  }

  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    return { error: "Choose a valid product URL slug." };
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: "Currency must be a 3-letter ISO-style code." };
  }

  if (!Number.isFinite(price) || price < 0 || price > 999999999999) {
    return { error: "Enter a valid product price." };
  }

  if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)) {
    return { error: "Enter a valid compare-at price." };
  }

  if (!Number.isInteger(stock) || stock < 0 || stock > 2147483647) {
    return { error: "Enter a valid stock quantity." };
  }

  if (!isProductStatus(status)) {
    return { error: "Choose a valid product status." };
  }

  return {
    value: {
      name,
      slug,
      description: description || null,
      brand: brand || null,
      category: category || null,
      sku,
      currency,
      price,
      compare_at_price: compareAtPrice,
      stock,
      status,
      featured,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
    },
  };
}

export async function createProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  "use server";

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "Please sign in first." };

  const storeId = String(formData.get("store_id") ?? "").trim();
  if (!storeId) return { error: "Select a store." };

  const parsed = readProduct(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      ...parsed.value,
    })
    .select("id,slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A product with this slug or SKU already exists in this store." };
    }
    return { error: "The product could not be created. Please try again." };
  }

  redirect("/dashboard/products?store=" + encodeURIComponent(storeId) + "&created=" + encodeURIComponent(product.id));
}

export async function updateProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  "use server";

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "Please sign in first." };

  const productId = String(formData.get("product_id") ?? "").trim();
  const storeId = String(formData.get("store_id") ?? "").trim();
  if (!productId || !storeId) return { error: "Missing product or store." };

  const parsed = readProduct(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("products")
    .update(parsed.value)
    .eq("id", productId)
    .eq("store_id", storeId);

  if (error) {
    if (error.code === "23505") {
      return { error: "A product with this slug or SKU already exists in this store." };
    }
    return { error: "The product could not be updated. Please try again." };
  }

  redirect("/dashboard/products?store=" + encodeURIComponent(storeId) + "&updated=" + encodeURIComponent(productId));
}

export async function deleteProductAction(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");

  const productId = String(formData.get("product_id") ?? "").trim();
  const storeId = String(formData.get("store_id") ?? "").trim();

  if (!productId || !storeId) {
    redirect("/dashboard/products");
  }

  await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", storeId);

  redirect("/dashboard/products?store=" + encodeURIComponent(storeId) + "&deleted=1");
}
