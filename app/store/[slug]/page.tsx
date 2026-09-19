import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getStoreUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id,name,slug,status,default_currency,locale,timezone,description,logo_url,cover_image_url,country_code")
    .eq("slug", slug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (!store) notFound();

  const { data: publicSettings } = await supabase
    .from("store_public_settings")
    .select("theme,homepage,announcement")
    .eq("store_id", store.id)
    .maybeSingle();

  const theme = publicSettings?.theme && typeof publicSettings.theme === "object"
    ? publicSettings.theme as Record<string, unknown>
    : {};
  const homepage = publicSettings?.homepage && typeof publicSettings.homepage === "object"
    ? publicSettings.homepage as Record<string, unknown>
    : {};
  const sections = Array.isArray(homepage.sections)
    ? homepage.sections.filter((value): value is string => typeof value === "string")
    : ["hero", "featured_products", "about", "faq"];
  const accent = typeof theme.accent === "string" && /^#[0-9a-f]{6}$/i.test(theme.accent)
    ? theme.accent
    : "#73edff";
  const heroTitle = typeof homepage.hero_title === "string" && homepage.hero_title.trim()
    ? homepage.hero_title
    : store.name;
  const heroSubtitle = typeof homepage.hero_subtitle === "string" && homepage.hero_subtitle.trim()
    ? homepage.hero_subtitle
    : "A premium independent store, powered by E-Commerce Premium.";

  const { data: products } = await supabase
    .from("products")
    .select("id,name,slug,description,price,compare_at_price,currency,stock,featured,brand,category,primary_image_url")
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <main className="storefront-shell" style={{ "--store-accent": accent } as CSSProperties}>
      <header className="store-header">
        <div className="page store-header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <div className="store-top-actions">
            <span>{store.default_currency}</span>
            <Link href={"/store/" + store.slug + "/cart"} className="button">Cart</Link>
          </div>
        </div>
      </header>

      {publicSettings?.announcement && (
        <div className="store-announcement">
          <div className="page">{publicSettings.announcement}</div>
        </div>
      )}

      {sections.includes("hero") && (
        <section className="store-hero">
          <div className="store-hero-glow" aria-hidden="true" />
          <div className="page">
            <div className="kicker">Independent storefront</div>
            <h1>{heroTitle}</h1>
            <p className="lead">{heroSubtitle}</p>
            <div className="store-url">{getStoreUrl(store.slug)}</div>
          </div>
        </section>
      )}

      {sections.includes("featured_products") && (
      <section className="page product-section">
        <div className="section-heading">
          <div>
            <div className="kicker">Catalog</div>
            <h2>Products</h2>
          </div>
          <span>{products?.length ?? 0} products</span>
        </div>

        {!products?.length ? (
          <div className="empty-card">
            <h2>This store is getting ready.</h2>
            <p>Products will appear here after the seller publishes them.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <Link
                href={"/store/" + store.slug + "/products/" + product.slug}
                className="product-card"
                key={product.id}
              >
                <div className="product-image">
                  {product.primary_image_url ? (
                    <Image
                      src={product.primary_image_url}
                      alt={product.name}
                      fill
                      sizes="(max-width: 760px) 50vw, 25vw"
                    />
                  ) : (
                    <span>EP</span>
                  )}
                </div>
                <div className="product-copy">
                  <span>{product.brand || product.category || "Product"}</span>
                  <h3>{product.name}</h3>
                  <div className="product-price">
                    <strong>{product.currency} {Number(product.price).toFixed(2)}</strong>
                    {product.compare_at_price != null && (
                      <del>{product.currency} {Number(product.compare_at_price).toFixed(2)}</del>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      )}

      {sections.includes("about") && (
        <section className="page store-content-section">
          <div className="content-card">
            <div className="kicker">About this store</div>
            <h2>{store.name}</h2>
            <p>{store.description || "This independent storefront is built and managed by its seller."}</p>
          </div>
        </section>
      )}

      {sections.includes("faq") && (
        <section className="page store-content-section">
          <div className="content-card">
            <div className="kicker">FAQ</div>
            <h2>Need help?</h2>
            <div className="faq-list">
              <details>
                <summary>How do I place an order?</summary>
                <p>Open a product, add it to the store cart and continue through checkout.</p>
              </details>
              <details>
                <summary>Which payment method is available?</summary>
                <p>This storefront currently supports cash on delivery where enabled by the store.</p>
              </details>
            </div>
          </div>
        </section>
      )}

      <footer className="footer store-footer">
        <span>{store.name}</span>
        <span>Powered by E-Commerce Premium</span>
      </footer>
    </main>
  );
}
