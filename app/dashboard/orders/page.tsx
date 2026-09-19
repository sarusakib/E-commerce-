import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function pick(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function OrdersDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStoreId = pick(params.store);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stores, error: storeError } = await supabase
    .from("stores")
    .select("id,name,slug,default_currency")
    .order("created_at", { ascending: false });

  if (storeError) {
    return <main className="shell"><div className="page"><div className="alert error">Could not load your stores.</div></div></main>;
  }

  const selectedStore = stores?.find((store) => store.id === requestedStoreId) ?? stores?.[0];

  const { data: orders, error: ordersError } = selectedStore
    ? await supabase
        .from("orders")
        .select("id,order_number,status,payment_status,currency,grand_total,customer_email,customer_phone,created_at")
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <div className="nav-actions">
            <Link href="/dashboard/products" className="button">Products</Link>
            <Link href="/dashboard" className="button">Dashboard</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Order management</div>
          <h1>Your <em>orders.</em></h1>
          <p className="lead">Order records, payment state and customer contact data remain scoped to the selected store.</p>
        </section>

        {!stores?.length ? (
          <section className="empty-card">
            <h2>Create a store first.</h2>
            <p>Orders will appear after your storefront starts receiving purchases.</p>
            <Link href="/store/create" className="button primary">Create store</Link>
          </section>
        ) : (
          <>
            <div className="store-switcher">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={"/dashboard/orders?store=" + store.id}
                  className={store.id === selectedStore?.id ? "store-switch active" : "store-switch"}
                >
                  {store.name}
                </Link>
              ))}
            </div>

            {ordersError ? (
              <div className="alert error">Could not load orders for this store.</div>
            ) : !orders?.length ? (
              <section className="empty-card">
                <span className="feature-index">00</span>
                <h2>No orders yet.</h2>
                <p>Published products and a working checkout will feed this order center.</p>
                <Link href={"/store/" + selectedStore?.slug} className="button primary">Open storefront</Link>
              </section>
            ) : (
              <section className="admin-product-table">
                <div className="admin-product-row order-row order-head">
                  <span>Order</span><span>Customer</span><span>Total</span><span>Status</span><span>Payment</span>
                </div>
                {orders.map((order) => (
                  <div className="admin-product-row order-row" key={order.id}>
                    <div>
                      <strong>#{order.order_number}</strong>
                      <small>{new Date(order.created_at).toLocaleString()}</small>
                    </div>
                    <div>
                      <strong>{order.customer_email}</strong>
                      <small>{order.customer_phone || "No phone"}</small>
                    </div>
                    <span>{order.currency} {Number(order.grand_total).toFixed(2)}</span>
                    <span className={"status-pill order-status-" + order.status}>{order.status}</span>
                    <span className={"status-pill payment-" + order.payment_status}>{order.payment_status.replace("_", " ")}</span>
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
