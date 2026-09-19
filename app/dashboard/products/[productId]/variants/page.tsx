import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VariantForm from "./VariantForm";
import { createVariantAction, deleteVariantAction, updateVariantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VariantsPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: product } = await supabase
    .from("products")
    .select("id,store_id,name,slug")
    .eq("id", productId)
    .maybeSingle();

  if (!product) notFound();

  const { data: store } = await supabase
    .from("stores")
    .select("id,name")
    .eq("id", product.store_id)
    .maybeSingle();

  if (!store) notFound();

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id,title,sku,barcode,option_values,price,compare_at_price,stock,weight_grams,image_url,sort_order")
    .eq("store_id", store.id)
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true });

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href={"/dashboard/products/" + product.id} className="brand">
            <span className="brand-mark">EP</span>
            <span>{product.name}</span>
          </Link>
          <Link href={"/dashboard/products/" + product.id} className="button">Product editor</Link>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Variant manager · {store.name}</div>
          <h1>Product <em>variants.</em></h1>
          <p className="lead">Size, color, material and future option sets can carry their own price, stock, SKU and media.</p>
        </section>

        <section className="store-form">
          <div className="form-section-title">Add variant</div>
          <VariantForm storeId={store.id} productId={product.id} action={createVariantAction} />
        </section>

        <section className="variant-list">
          {(variants ?? []).map((variant) => (
            <article className="variant-card" key={variant.id}>
              <div className="variant-card-head">
                <div>
                  <span className="feature-index">VARIANT</span>
                  <h2>{variant.title}</h2>
                </div>
                <form action={deleteVariantAction}>
                  <input type="hidden" name="store_id" value={store.id} />
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="variant_id" value={variant.id} />
                  <button className="button danger-button" type="submit">Delete</button>
                </form>
              </div>
              <VariantForm storeId={store.id} productId={product.id} variant={variant} action={updateVariantAction} />
            </article>
          ))}
          {!variants?.length && <section className="empty-card"><p>No variants yet. Add size/color/material combinations above.</p></section>}
        </section>
      </div>
    </main>
  );
}
