"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SECTION_IDS = new Set(["hero", "featured_products", "about", "faq"]);
const PRESETS = new Set(["aura", "minimal", "noir", "editorial"]);

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export type BuilderState = {
  error?: string;
  success?: string;
};

export async function saveStoreBuilder(
  _previous: BuilderState,
  formData: FormData,
): Promise<BuilderState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const storeId = text(formData, "store_id", 64);
  const storeName = text(formData, "store_name", 80);
  const description = text(formData, "description", 500);
  const heroTitle = text(formData, "hero_title", 120);
  const heroSubtitle = text(formData, "hero_subtitle", 240);
  const announcement = text(formData, "announcement", 180);
  const preset = text(formData, "preset", 30).toLowerCase();
  const accent = text(formData, "accent", 20).toLowerCase();
  const sectionsRaw = text(formData, "sections", 2000);

  if (!storeId || storeName.length < 2) return { error: "Enter a valid store name." };
  if (!PRESETS.has(preset)) return { error: "Choose a valid theme preset." };
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return { error: "Theme accent must be a 6-digit hex color." };

  let sections: string[] = [];
  try {
    const parsed = JSON.parse(sectionsRaw);
    if (!Array.isArray(parsed)) throw new Error();
    sections = parsed.filter((value): value is string => typeof value === "string" && SECTION_IDS.has(value));
  } catch {
    return { error: "Homepage section configuration is invalid." };
  }

  if (!sections.includes("hero")) sections.unshift("hero");
  sections = Array.from(new Set(sections)).slice(0, 8);

  const { data: store, error: storeReadError } = await supabase
    .from("stores")
    .select("id,slug")
    .eq("id", storeId)
    .maybeSingle();

  if (storeReadError || !store) return { error: "Store not found or access is not allowed." };

  const { error: storeUpdateError } = await supabase
    .from("stores")
    .update({
      name: storeName,
      description,
    })
    .eq("id", storeId);

  if (storeUpdateError) return { error: "Store details could not be saved." };

  const { error: settingsError } = await supabase
    .from("store_public_settings")
    .upsert({
      store_id: storeId,
      theme: { preset, accent },
      homepage: {
        hero_title: heroTitle || storeName,
        hero_subtitle: heroSubtitle || "Independent commerce, designed for your brand.",
        sections,
      },
      announcement,
    }, { onConflict: "store_id" });

  if (settingsError) return { error: "Storefront design could not be saved." };

  revalidatePath("/dashboard/stores/" + storeId + "/builder");
  revalidatePath("/store/" + store.slug);

  return { success: "Storefront saved successfully." };
}
