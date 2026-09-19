import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function pick(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestedStoreId = pick(query.store);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id,name,slug")
    .order("created_at", { ascending: false });

  const selectedStore = stores?.find((store) => store.id === requestedStoreId) ?? stores?.[0];

  const { data: customers, error } = selectedStore
    ? await supabase
        .from("customers")
        .select("id,email,first_name,last_name,phone,created_at,updated_at")
        .eq("store_id", selectedStore.id)
        .order("updated_at", { ascending: false })
        .limit(200)
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
            <Link href="/dashboard/orders" className="button">Orders</Link>
            <Link href="/dashboard/products" className="button">Products</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Customer center</div>
          <h1>Your <em>customers.</em></h1>
          <p className="lead">Customer records and contact data remain isolated to the selected store.</p>
        </section>

        {!stores?.length ? (
          <section className="empty-card">
            <h2>Create a store first.</h2>
            <p>Your customer base will be created by checkout activity.</p>
            <Link href="/store/create" className="button primary">Create store</Link>
          </section>
        ) : (
          <>
            <div className="store-switcher">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={"/dashboard/customers?store=" + store.id}
                  className={store.id === selectedStore?.id ? "store-switch active" : "store-switch"}
                >
                  {store.name}
                </Link>
              ))}
            </div>

            {error ? (
              <div className="alert error">Could not load customers.</div>
            ) : !customers?.length ? (
              <section className="empty-card">
                <span className="feature-index">00</span>
                <h2>No customers yet.</h2>
                <p>Customers will appear here after the first completed checkout.</p>
              </section>
            ) : (
              <section className="admin-product-table">
                <div className="admin-product-row customer-row customer-head">
                  <span>Customer</span><span>Phone</span><span>Created</span><span>Updated</span>
                </div>
                {customers.map((customer) => (
                  <div className="admin-product-row customer-row" key={customer.id}>
                    <div>
                      <strong>{[customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer"}</strong>
                      <small>{customer.email}</small>
                    </div>
                    <span>{customer.phone || "—"}</span>
                    <span>{new Date(customer.created_at).toLocaleDateString()}</span>
                    <span>{new Date(customer.updated_at).toLocaleDateString()}</span>
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
