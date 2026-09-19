import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProductActionState } from "../../types";

function parseVariant(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  const optionsText = String(formData.get("option_values") ?? "").trim();
  const price = Number(formData.get("price"));
  const compareAtText = String(formData.get("compare_at_price") ?? "").trim();
  const compareAtPrice = compareAtText ? Number(compareAtText) : null;
  const stock = Number(formData.get("stock"));
  const weightText = String(formData.get("weight_grams") ?? "").trim();
  const weightGrams = weightText ? Number(weightText) : null;
  const imageUrl = String(formData.get("image_url") ?? "").trim();

  if (title.length < 1 || title.length > 180) return { error: "Variant title is required." };
  if (!Number.isFinite(price) || price < 0) return { error: "Variant price is invalid." };
  if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)) return { error: "Compare-at price is invalid." };
  if (!Number.isInteger(stock) || stock < 0) return { error: "Variant stock is invalid." };
  if (weightGrams !== null && (!Number.isFinite(weightGrams) || weightGrams < 0)) return { error: "Variant weight is invalid." };
  if (imageUrl && imageUrl.length > 2048) return { error: "Variant image URL is too long." };

  let optionValues: Record<string, string> = {};
  if (optionsText) {
    try {
      const parsed = JSON.parse(optionsText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { error: "Option values must be a JSON object." };
      }
      optionValues = Object.fromEntries(
        Object.entries(parsed).slice(0, 12).map(([key, value]) => [
          key.slice(0, 40),
          String(value).slice(0, 100),
        ]),
      );
    } catch {
      return { error: 'Options example: {"size":"L","color":"Black"}' };
    }
  }

  return {
    value: {
      title,
      sku,
      barcode,
      option_values: optionValues,
      price,
      compare_at_price: compareAtPrice,
      stock,
      weight_grams: weightGrams,
      image_url: imageUrl || null,
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    },
  };
}

async function userCanEditProduct(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string, productId: string) {
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  return Boolean(data);
}

export async function createVariantAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  "use server";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = String(formData.get("store_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!storeId || !productId || !(await userCanEditProduct(supabase, storeId, productId))) {
    return { error: "Product access is not allowed." };
  }

  const parsed = parseVariant(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase.from("product_variants").insert({
    store_id: storeId,
    product_id: productId,
    ...parsed.value,
  });

  if (error) {
    return {
      error: error.code === "23505"
        ? "That variant SKU already exists in this store."
        : "Could not create variant.",
    };
  }

  revalidatePath("/dashboard/products/" + productId + "/variants");
  return {};
}

export async function updateVariantAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  "use server";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = String(formData.get("store_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();

  if (!storeId || !productId || !variantId || !(await userCanEditProduct(supabase, storeId, productId))) {
    return { error: "Variant access is not allowed." };
  }

  const parsed = parseVariant(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("product_variants")
    .update(parsed.value)
    .eq("id", variantId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    return {
      error: error.code === "23505"
        ? "That variant SKU already exists in this store."
        : "Could not update variant.",
    };
  }

  revalidatePath("/dashboard/products/" + productId + "/variants");
  return {};
}

export async function deleteVariantAction(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = String(formData.get("store_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();

  if (!storeId || !productId || !variantId) return;

  await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  revalidatePath("/dashboard/products/" + productId + "/variants");
}
