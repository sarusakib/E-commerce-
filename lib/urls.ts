const PLATFORM_DOMAIN = (
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "ecommerce-premium.vercel.app"
)
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

export function getStoreHost(slug: string) {
  return slug + "." + PLATFORM_DOMAIN;
}

export function getStoreUrl(slug: string) {
  return "https://" + getStoreHost(slug);
}

export function getProductUrl(slug: string, productSlug: string) {
  return getStoreUrl(slug) + "/products/" + encodeURIComponent(productSlug);
}
