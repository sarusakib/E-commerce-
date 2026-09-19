import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StoreProductsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id,name,slug,status,default_currency")
    .eq("slug", slug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (!store) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("id,name,slug,price,currency,primary_image_url,brand,category")
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <main className="storefront-shell">
      <div className="page">
        <header className="nav">
          <Link href={"/store/" + store.slug} className="brand">
            <span className="brand-mark">EP</span>
            <span>{store.name}</span>
          </Link>
          <Link href={"/store/" + store.slug} className="button">Store home</Link>
        </header>

        <section className="form-hero">
          <div className="kicker">Catalog</div>
          <h1>{store.name} <em>products.</em></h1>
          <p className="lead">Every product has its own canonical URL for direct sharing and social previews.</p>
        </section>

        {!products?.length ? (
          <section className="empty-card">
            <h2>No published products yet.</h2>
            <p>The seller can add products from the upcoming commerce management workspace.</p>
          </section>
        ) : (
          <section className="product-grid product-section">
            {products.map((product) => (
              <Link
                href={"/store/" + store.slug + "/products/" + product.slug}
                className="product-card"
                key={product.id}
              >
                <div className="product-image">
                  {product.primary_image_url ? <img src={product.primary_image_url} alt="" loading="lazy" /> : <span>EP</span>}
                </div>
                <div className="product-copy">
                  <span>{product.brand || product.category || "Product"}</span>
                  <h3>{product.name}</h3>
                  <div className="product-price">
                    <strong>{product.currency} {Number(product.price).toFixed(2)}</strong>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
