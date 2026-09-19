import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProductUrl, getStoreUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecommerce-premium.vercel.app";
  const supabase = await createClient();

  const [{ data: stores }, { data: products }] = await Promise.all([
    supabase
      .from("stores")
      .select("id,slug,updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
    supabase
      .from("products")
      .select("store_id,slug,updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
  ]);

  const storeUrls: MetadataRoute.Sitemap = (stores ?? []).map((store) => ({
    url: getStoreUrl(store.slug),
    lastModified: store.updated_at,
  }));

  const storeMap = new Map((stores ?? []).map((store) => [store.id, store.slug]));
  const productUrls: MetadataRoute.Sitemap = (products ?? [])
    .map((product) => {
      const storeSlug = storeMap.get(product.store_id);
      if (!storeSlug) return null;
      return {
        url: getProductUrl(storeSlug, product.slug),
        lastModified: product.updated_at,
      };
    })
    .filter((item): item is MetadataRoute.Sitemap[number] => item !== null);

  return [
    { url: siteUrl, lastModified: new Date() },
    ...storeUrls,
    ...productUrls,
  ];
}
