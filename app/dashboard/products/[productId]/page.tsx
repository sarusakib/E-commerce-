import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "../ProductForm";
import { updateProductAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
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
    .select("id,store_id,name,slug,description,brand,category,sku,currency,price,compare_at_price,stock,status,featured,seo_title,seo_description")
    .eq("id", productId)
    .maybeSingle();

  if (!product) notFound();

  const { data: store } = await supabase
    .from("stores")
    .select("id,name,slug,default_currency")
    .eq("id", product.store_id)
    .maybeSingle();

  if (!store) notFound();

  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href={"/dashboard/products?store=" + store.id} className="brand">
            <span className="brand-mark">EP</span>
            <span>{store.name}</span>
          </Link>
          <Link href={"/store/" + store.slug + "/products/" + product.slug} className="button">Preview product</Link>
        </header>

        <section className="form-hero">
          <div className="kicker">Product editor</div>
          <h1>Edit <em>{product.name}.</em></h1>
          <p className="lead">Changes remain scoped to {store.name}; other stores cannot access this record.</p>
        </section>

        <ProductForm
          storeId={store.id}
          storeCurrency={store.default_currency}
          product={product}
          action={updateProductAction}
        />
      </div>
    </main>
  );
}
