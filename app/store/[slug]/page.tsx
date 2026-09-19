import Image from "next/image";
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

  const { data: products } = await supabase
    .from("products")
    .select("id,name,slug,description,price,compare_at_price,currency,stock,featured,brand,category,primary_image_url")
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <main className="storefront-shell">
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

      <section className="store-hero">
        <div className="store-hero-glow" aria-hidden="true" />
        <div className="page">
          <div className="kicker">Independent storefront</div>
          <h1>{store.name}</h1>
          <p className="lead">{store.description || "A premium independent store, powered by E-Commerce Premium."}</p>
          <div className="store-url">{getStoreUrl(store.slug)}</div>
        </div>
      </section>

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

      <footer className="footer store-footer">
        <span>{store.name}</span>
        <span>Powered by E-Commerce Premium</span>
      </footer>
    </main>
  );
}
