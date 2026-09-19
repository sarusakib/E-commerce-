import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getProductUrl, getStoreUrl } from "@/lib/urls";
import AddToCartButton from "./AddToCartButton";
import ShareProduct from "./ShareProduct";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string; productSlug: string }>;
};

async function getProduct(slug: string, productSlug: string) {
  const supabase = createPublicClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id,name,slug,status,default_currency")
    .eq("slug", slug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (!store) return null;

  const { data: product } = await supabase
    .from("products")
    .select("id,name,slug,description,price,compare_at_price,currency,stock,featured,brand,category,primary_image_url,seo_title,seo_description,sku")
    .eq("store_id", store.id)
    .eq("slug", productSlug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (!product) return null;

  return { store, product };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const result = await getProduct(slug, productSlug);

  if (!result) return { title: "Product not found" };

  const store = result.store;
  const product = result.product;
  const title = product.seo_title?.trim() || product.name;
  const description =
    product.seo_description?.trim() ||
    product.description?.trim() ||
    "Shop " + product.name + " from " + store.name + ".";
  const canonical = getProductUrl(store.slug, product.slug);
  const image = product.primary_image_url || "/logo.svg";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: store.name,
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    other: {
      "product:price:amount": String(product.price),
      "product:price:currency": product.currency,
      "product:availability": product.stock > 0 ? "in stock" : "out of stock",
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug, productSlug } = await params;
  const result = await getProduct(slug, productSlug);

  if (!result) notFound();

  const store = result.store;
  const product = result.product;
  const canonical = getProductUrl(store.slug, product.slug);
  const image = product.primary_image_url || "/logo.svg";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    sku: product.sku || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: [image],
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: product.currency,
      price: String(product.price),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <main className="shell product-detail-shell">
      <div className="page">
        <header className="nav">
          <Link href={getStoreUrl(store.slug)} className="brand">
            <span className="brand-mark">EP</span>
            <span>{store.name}</span>
          </Link>
          <div className="nav-actions">
            <ShareProduct title={product.name} url={canonical} />
            <Link href={getStoreUrl(store.slug)} className="button">Store</Link>
          </div>
        </header>

        <div className="breadcrumbs">
          <Link href={getStoreUrl(store.slug)}>{store.name}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </div>

        <section className="product-detail">
          <div className="product-detail-image">
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 760px) 100vw, 55vw"
              priority
            />
          </div>

          <div className="product-detail-copy">
            <div className="kicker">{product.brand || product.category || "Product"}</div>
            <h1>{product.name}</h1>
            <div className="detail-price">
              <strong>{product.currency} {Number(product.price).toFixed(2)}</strong>
              {product.compare_at_price != null && (
                <del>{product.currency} {Number(product.compare_at_price).toFixed(2)}</del>
              )}
            </div>
            <p>{product.description || "A premium product from this independent store."}</p>
            <div className="detail-meta">
              <span>{product.stock > 0 ? "In stock" : "Out of stock"}</span>
              {product.sku && <span>SKU {product.sku}</span>}
            </div>
            <div className="actions">
              <AddToCartButton
                storeSlug={store.slug}
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  currency: product.currency,
                  stock: product.stock,
                  primary_image_url: product.primary_image_url,
                }}
              />
              <ShareProduct title={product.name} />
            </div>
            <p className="share-note">Canonical product link ready for social previews and direct sharing.</p>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </div>
    </main>
  );
}
