import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function pick(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStoreId = pick(params.store);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id,name,slug,default_currency")
    .order("created_at", { ascending: false });

  const selectedStore = stores?.find((store) => store.id === requestedStoreId) ?? stores?.[0];

  const [{ data: events }, { data: orders }] = selectedStore
    ? await Promise.all([
        supabase
          .from("analytics_events")
          .select("event_name,session_id,product_id,value,currency,created_at")
          .eq("store_id", selectedStore.id)
          .order("created_at", { ascending: false })
          .limit(10000),
        supabase
          .from("orders")
          .select("id,status,grand_total,currency,created_at")
          .eq("store_id", selectedStore.id)
          .order("created_at", { ascending: false })
          .limit(5000),
      ])
    : [{ data: [] }, { data: [] }];

  const eventRows = events ?? [];
  const orderRows = orders ?? [];
  const sessions = new Set(eventRows.map((event) => event.session_id));
  const views = eventRows.filter((event) => event.event_name === "product_view").length;
  const addToCart = eventRows.filter((event) => event.event_name === "add_to_cart").length;
  const checkoutStarts = eventRows.filter((event) => event.event_name === "checkout_started").length;
  const purchases = eventRows.filter((event) => event.event_name === "purchase").length;
  const grossValue = orderRows
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.grand_total), 0);
  const conversion = sessions.size ? (purchases / sessions.size) * 100 : 0;

  const productCounts = new Map<string, number>();
  for (const event of eventRows) {
    if (event.event_name !== "product_view" || !event.product_id) continue;
    productCounts.set(event.product_id, (productCounts.get(event.product_id) ?? 0) + 1);
  }

  const topProductIds = [...productCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  const { data: topProducts } = topProductIds.length
    ? await supabase.from("products").select("id,name,slug").in("id", topProductIds)
    : { data: [] };

  const productMap = new Map((topProducts ?? []).map((product) => [product.id, product]));

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <div className="nav-actions">
            <Link href="/dashboard/orders" className="button">Orders</Link>
            <Link href="/dashboard" className="button">Dashboard</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Analytics</div>
          <h1>Know what <em>moves.</em></h1>
          <p className="lead">Metrics are calculated from store-scoped analytics events and server-created order records.</p>
        </section>

        {!stores?.length ? (
          <section className="empty-card">
            <h2>Create a store first.</h2>
            <p>Analytics will appear after your storefront receives traffic.</p>
            <Link href="/store/create" className="button primary">Create store</Link>
          </section>
        ) : (
          <>
            <div className="store-switcher">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={"/dashboard/analytics?store=" + store.id}
                  className={store.id === selectedStore?.id ? "store-switch active" : "store-switch"}
                >
                  {store.name}
                </Link>
              ))}
            </div>

            <section className="metric-grid">
              <article className="metric-card"><span>Unique sessions</span><strong>{sessions.size}</strong></article>
              <article className="metric-card"><span>Product views</span><strong>{views}</strong></article>
              <article className="metric-card"><span>Add to cart</span><strong>{addToCart}</strong></article>
              <article className="metric-card"><span>Checkout starts</span><strong>{checkoutStarts}</strong></article>
              <article className="metric-card"><span>Orders</span><strong>{orderRows.length}</strong></article>
              <article className="metric-card"><span>Conversion</span><strong>{conversion.toFixed(2)}%</strong></article>
              <article className="metric-card"><span>Gross order value</span><strong>{selectedStore?.default_currency} {grossValue.toFixed(2)}</strong></article>
            </section>

            <section className="analytics-two-column">
              <div className="store-form">
                <div className="form-section-title">Funnel</div>
                <div className="funnel-list">
                  <div><span>Product views</span><strong>{views}</strong></div>
                  <div><span>Add to cart</span><strong>{addToCart}</strong></div>
                  <div><span>Checkout starts</span><strong>{checkoutStarts}</strong></div>
                  <div><span>Purchases</span><strong>{purchases}</strong></div>
                </div>
                <p className="checkout-note">Purchase events are emitted from the server-side order transaction.</p>
              </div>

              <div className="store-form">
                <div className="form-section-title">Top viewed products</div>
                <div className="top-products">
                  {topProductIds.map((id) => {
                    const product = productMap.get(id);
                    return (
                      <div key={id}>
                        <span>{product?.name ?? "Product"}</span>
                        <strong>{productCounts.get(id)} views</strong>
                      </div>
                    );
                  })}
                  {!topProductIds.length && <p className="checkout-note">No product-view data yet.</p>}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
