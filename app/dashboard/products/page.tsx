import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteProductAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pick(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function DashboardProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestedStoreId = pick(params.store);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stores, error: storeError } = await supabase
    .from("stores")
    .select("id,name,slug,default_currency,status")
    .order("created_at", { ascending: false });

  if (storeError) {
    return (
      <main className="shell"><div className="page">
        <div className="alert error">Could not load your stores.</div>
      </div></main>
    );
  }

  const selectedStore =
    stores?.find((store) => store.id === requestedStoreId) ??
    stores?.[0];

  const products = selectedStore
    ? (await supabase
        .from("products")
        .select("id,name,slug,sku,brand,category,price,currency,stock,status,featured,updated_at")
        .eq("store_id", selectedStore.id)
        .order("updated_at", { ascending: false })
      ).data
    : [];

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <div className="nav-actions">
            <Link href="/store/create" className="button">New store</Link>
            <Link href="/" className="button">Home</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Product management</div>
          <h1>Build your <em>catalog.</em></h1>
          <p className="lead">Every product belongs to one store and remains isolated by the same tenant security model.</p>
        </section>

        {!stores?.length ? (
          <section className="empty-card">
            <h2>Create a store first.</h2>
            <p>Products can only exist inside an independent storefront.</p>
            <Link href="/store/create" className="button primary">Create store</Link>
          </section>
        ) : (
          <>
            <section className="catalog-toolbar">
              <div>
                <span className="kicker">Selected store</span>
                <strong>{selectedStore?.name}</strong>
              </div>
              <div className="nav-actions">
                <Link href={"/dashboard/products/new?store=" + selectedStore?.id} className="button primary">Add product</Link>
                <Link href={"/store/" + selectedStore?.slug} className="button">Open storefront</Link>
              </div>
            </section>

            <div className="store-switcher">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={"/dashboard/products?store=" + store.id}
                  className={store.id === selectedStore?.id ? "store-switch active" : "store-switch"}
                >
                  {store.name}
                </Link>
              ))}
            </div>

            {!products?.length ? (
              <section className="empty-card">
                <span className="feature-index">01</span>
                <h2>No products yet.</h2>
                <p>Create the first product and publish it to your store.</p>
                <Link href={"/dashboard/products/new?store=" + selectedStore?.id} className="button primary">Create first product</Link>
              </section>
            ) : (
              <section className="admin-product-table">
                <div className="admin-product-row admin-product-head">
                  <span>Product</span><span>Price</span><span>Stock</span><span>Status</span><span />
                </div>
                {products.map((product) => (
                  <div className="admin-product-row" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <small>{product.slug}{product.sku ? " · " + product.sku : ""}</small>
                    </div>
                    <span>{product.currency} {Number(product.price).toFixed(2)}</span>
                    <span>{product.stock}</span>
                    <span className={"status-pill status-" + product.status}>{product.status}</span>
                    <div className="row-actions">
                      <Link href={"/dashboard/products/" + product.id + "?store=" + selectedStore.id} className="button">Edit</Link>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="store_id" value={selectedStore.id} />
                        <button className="button danger-button" type="submit">Delete</button>
                      </form>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
