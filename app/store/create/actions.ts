import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateStoreState = {
  error?: string;
};

const RESERVED = new Set([
  "admin", "api", "auth", "dashboard", "help", "login", "mail", "settings",
  "shop", "store", "support", "www", "app", "cdn", "static",
]);

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function validSlug(value: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value) && !RESERVED.has(value);
}

export async function createStoreAction(
  _previous: CreateStoreState,
  formData: FormData,
): Promise<CreateStoreState> {
  "use server";

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: "Please sign in before creating a store." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const suppliedSlug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const slug = suppliedSlug || slugify(name);
  const currency = String(formData.get("currency") ?? "USD").toUpperCase();
  const locale = String(formData.get("locale") ?? "en").toLowerCase();
  const timezone = String(formData.get("timezone") ?? "UTC");

  if (name.length < 2 || name.length > 80) {
    return { error: "Store name must be between 2 and 80 characters." };
  }

  if (!validSlug(slug)) {
    return { error: "Choose a valid URL slug that is not a reserved platform name." };
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: "Choose a supported 3-letter currency code." };
  }

  if (!/^[a-z]{2,10}$/.test(locale)) {
    return { error: "Choose a valid store language." };
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      name,
      slug,
      status: "active",
      default_currency: currency,
      locale,
      timezone,
      description: "",
    })
    .select("id, slug")
    .single();

  if (storeError) {
    const duplicate = storeError.code === "23505";
    return { error: duplicate ? "That store URL is already in use. Choose another slug." : "The store could not be created. Please try again." };
  }

  redirect(`/dashboard?store=${store.id}`);
}
