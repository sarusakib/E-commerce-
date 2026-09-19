import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CouponForm from "./CouponForm";
import { createCouponAction, deleteCouponAction, updateCouponAction } from "./actions";

export const dynamic = "force-dynamic";

function pick(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function CouponsPage({
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
    .select("id,name,slug")
    .order("created_at", { ascending: false });

  const selectedStore = stores?.find((store) => store.id === requestedStoreId) ?? stores?.[0];

  const { data: coupons, error } = selectedStore
    ? await supabase
        .from("coupons")
        .select("id,code,type,value,min_subtotal,max_discount,starts_at,ends_at,usage_limit,usage_count,per_customer_limit,active")
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false })
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
            <Link href="/dashboard/customers" className="button">Customers</Link>
            <Link href="/dashboard" className="button">Dashboard</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Marketing</div>
          <h1>Coupons that <em>actually calculate.</em></h1>
          <p className="lead">Discounts are validated and applied inside the server-side order transaction.</p>
        </section>

        {!stores?.length ? (
          <section className="empty-card">
            <h2>Create a store first.</h2>
            <p>Coupons belong to one independent storefront.</p>
            <Link href="/store/create" className="button primary">Create store</Link>
          </section>
        ) : (
          <>
            <div className="store-switcher">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={"/dashboard/coupons?store=" + store.id}
                  className={store.id === selectedStore?.id ? "store-switch active" : "store-switch"}
                >
                  {store.name}
                </Link>
              ))}
            </div>

            <section className="store-form">
              <div className="form-section-title">Create coupon · {selectedStore?.name}</div>
              <CouponForm storeId={selectedStore!.id} action={createCouponAction} />
            </section>

            {error && <div className="alert error">Could not load coupons.</div>}

            <section className="coupon-list">
              {(coupons ?? []).map((coupon) => (
                <article className="coupon-card" key={coupon.id}>
                  <div className="coupon-card-head">
                    <div>
                      <span className="feature-index">COUPON</span>
                      <h2>{coupon.code}</h2>
                    </div>
                    <span className={coupon.active ? "status-pill status-active" : "status-pill"}>
                      {coupon.active ? "active" : "disabled"}
                    </span>
                  </div>

                  <div className="coupon-meta">
                    <span>{coupon.type === "percentage" ? Number(coupon.value) + "%" : String(coupon.value)}</span>
                    <span>Used {coupon.usage_count}{coupon.usage_limit ? " / " + coupon.usage_limit : ""}</span>
                    <span>Per customer {coupon.per_customer_limit}</span>
                  </div>

                  <CouponForm storeId={selectedStore!.id} coupon={coupon} action={updateCouponAction} />

                  <form action={deleteCouponAction} className="coupon-delete-form">
                    <input type="hidden" name="coupon_id" value={coupon.id} />
                    <input type="hidden" name="store_id" value={selectedStore!.id} />
                    <button className="button danger-button" type="submit">Delete coupon</button>
                  </form>
                </article>
              ))}
              {!coupons?.length && <section className="empty-card"><p>No coupons yet.</p></section>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
