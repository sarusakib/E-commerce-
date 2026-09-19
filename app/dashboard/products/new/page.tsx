import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "../ProductForm";
import { createProductAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = typeof params.store === "string" ? params.store : "";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id,name,slug,default_currency")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) redirect("/dashboard/products");

  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href="/dashboard/products" className="brand">
            <span className="brand-mark">EP</span>
            <span>Product management</span>
          </Link>
          <Link href={"/dashboard/products?store=" + store.id} className="button">Back to catalog</Link>
        </header>

        <section className="form-hero">
          <div className="kicker">New product · {store.name}</div>
          <h1>Add a <em>product.</em></h1>
          <p className="lead">The product URL becomes the permanent share identity used by your storefront and social previews.</p>
        </section>

        <ProductForm storeId={store.id} storeCurrency={store.default_currency} action={createProductAction} />
      </div>
    </main>
  );
}
