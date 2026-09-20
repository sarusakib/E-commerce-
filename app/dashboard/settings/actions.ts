"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStorePermission } from "@/lib/auth/access";
import { isSupportedCurrency } from "@/lib/commerce/core";

export type StoreSettingsState = { error?: string; success?: string };

export async function updateStoreSettings(
  _previous: StoreSettingsState,
  formData: FormData,
): Promise<StoreSettingsState> {
  const storeId = String(formData.get("store_id") ?? "");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) return { error: "Invalid store." };

  const supabase = await createClient();
  try {
    await requireStorePermission(supabase, storeId, "settings:write");
  } catch {
    return { error: "You do not have permission to edit this store." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 5000);
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const locale = String(formData.get("locale") ?? "").trim().toLowerCase();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const countryCode = String(formData.get("country_code") ?? "").trim().toUpperCase();
  const announcement = String(formData.get("announcement") ?? "").trim().slice(0, 500);
  const accent = String(formData.get("accent") ?? "").trim();

  if (name.length < 2 || name.length > 80) return { error: "Store name must be between 2 and 80 characters." };
  if (!isSupportedCurrency(currency)) return { error: "Unsupported currency." };
  if (!/^[a-z]{2,10}$/.test(locale)) return { error: "Invalid locale." };
  if (!/^[A-Z]{2}$/.test(countryCode)) return { error: "Invalid country code." };
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return { error: "Accent color must be a valid hex color." };

  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    return { error: "Use a valid IANA timezone such as Asia/Dhaka." };
  }

  const { error: storeError } = await supabase.from("stores").update({
    name,
    description,
    default_currency: currency,
    locale,
    timezone,
    country_code: countryCode,
  }).eq("id", storeId);

  if (storeError) return { error: "Store settings could not be saved." };

  const { data: existing } = await supabase.from("store_public_settings")
    .select("theme,homepage,seo,announcement").eq("store_id", storeId).maybeSingle();
  const theme =
    existing?.theme && typeof existing.theme === "object"
      ? (existing.theme as Record<string, unknown>)
      : {};

  const publicWrite = await supabase.from("store_public_settings").upsert({
    store_id: storeId,
    theme: { ...theme, accent },
    homepage: existing?.homepage ?? {},
    seo: existing?.seo ?? {},
    announcement,
  });
  if (publicWrite.error) return { error: "Public store settings could not be saved." };

  const privateWrite = await supabase.from("store_settings").upsert({
    store_id: storeId,
    theme: { accent },
    seo: existing?.seo ?? {},
    checkout: { currency, countryCode },
    notifications: {},
    integrations: {},
  });
  if (privateWrite.error) return { error: "Private store settings could not be saved." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  if (slug) revalidatePath("/store/" + slug);

  return { success: "Store settings saved." };
}
