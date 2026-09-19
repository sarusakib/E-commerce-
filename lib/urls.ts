const PLATFORM_DOMAIN =
  (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "ecommerce-premium.vercel.app")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

export function getStoreHost(slug: string) {
  return `${slug}.${PLATFORM_DOMAIN}`;
}

export function getStoreUrl(slug: string) {
  return `https://${getStoreHost(slug)}`;
}

export function getProductPath(slug: string, productSlug: string) {
  return `/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(productSlug)}`;
}

export function getProductUrl(slug: string, productSlug: string) {
  return `https://${getStoreHost(slug)}/products/${encodeURIComponent(productSlug)}`;
}
