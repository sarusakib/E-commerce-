import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/app/dashboard/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: customerRows } = await supabase
    .from("customers")
    .select("id,store_id,email,first_name,last_name,phone,created_at")
    .eq("auth_user_id", auth.user.id)
    .order("created_at", { ascending: false });

  const storeIds = (customerRows ?? []).map((row) => row.store_id);
  const { data: stores } = storeIds.length
    ? await supabase.from("stores").select("id,name,slug,default_currency").in("id", storeIds)
    : { data: [] };

  const storeMap = new Map((stores ?? []).map((store) => [store.id, store]));

  const customers = customerRows ?? [];
  const orders = customers.length
    ? (await supabase
        .from("orders")
        .select("id,store_id,order_number,status,payment_status,currency,grand_total,created_at")
        .in("customer_id", customers.map((row) => row.id))
        .order("created_at", { ascending: false })
        .limit(100)
      ).data
    : [];

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href="/" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <div className="nav-actions">
            <Link href="/" className="button">Home</Link>
            <SignOutButton />
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Customer account</div>
          <h1>Your <em>commerce.</em></h1>
          <p className="lead">Signed-in orders are separated by store and remain protected by tenant-aware database policies.</p>
        </section>

        <section className="account-profile">
          <div className="store-form">
            <div className="form-section-title">Profile</div>
            <div className="detail-stack">
              <div><span>Email</span><strong>{auth.user.email}</strong></div>
              <div><span>Stores with customer history</span><strong>{stores?.length ?? 0}</strong></div>
            </div>
          </div>
        </section>

        <section className="store-form account-orders">
          <div className="section-heading">
            <div><div className="kicker">Order history</div><h2>Your orders</h2></div>
            <span>{orders?.length ?? 0} orders</span>
          </div>

          {!orders?.length ? (
            <div className="empty-card"><p>No signed-in orders yet. Guest orders remain available through their confirmation reference.</p></div>
          ) : (
            <div className="admin-product-table">
              {orders.map((order) => {
                const store = storeMap.get(order.store_id);
                return (
                  <div className="admin-product-row account-order-row" key={order.id}>
                    <div>
                      <strong>#{order.order_number}</strong>
                      <small>{store?.name ?? "Store"} · {new Date(order.created_at).toLocaleString()}</small>
                    </div>
                    <span className={"status-pill order-status-" + order.status}>{order.status}</span>
                    <span className={"status-pill payment-" + order.payment_status}>{order.payment_status.replace("_", " ")}</span>
                    <strong>{order.currency} {Number(order.grand_total).toFixed(2)}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
