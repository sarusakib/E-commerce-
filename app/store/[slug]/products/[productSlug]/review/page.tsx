import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id,name,slug,status")
    .eq("slug", slug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (!store) notFound();

  const { data: product } = await supabase
    .from("products")
    .select("id,name,slug")
    .eq("store_id", store.id)
    .eq("slug", productSlug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (!product) notFound();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", store.id)
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  if (!customer) {
    return (
      <main className="shell">
        <div className="page">
          <section className="empty-card not-found-card">
            <div className="kicker">Review eligibility</div>
            <h1>Order history not found.</h1>
            <p>Complete a purchase with this account before submitting a verified review.</p>
            <Link href={"/store/" + store.slug + "/products/" + product.slug} className="button primary">Back to product</Link>
          </section>
        </div>
      </main>
    );
  }

  const { data: deliveredOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("store_id", store.id)
    .eq("customer_id", customer.id)
    .eq("status", "delivered")
    .order("created_at", { ascending: false })
    .limit(50);

  const orderIds = (deliveredOrders ?? []).map((order) => order.id);

  const { data: eligibleItem } = orderIds.length
    ? await supabase
        .from("order_items")
        .select("order_id")
        .eq("store_id", store.id)
        .eq("product_id", product.id)
        .in("order_id", orderIds)
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (!eligibleItem) {
    return (
      <main className="shell">
        <div className="page">
          <section className="empty-card not-found-card">
            <div className="kicker">Verified review</div>
            <h1>Review unlocks after delivery.</h1>
            <p>This account does not have a delivered order containing this product.</p>
            <Link href={"/store/" + store.slug + "/products/" + product.slug} className="button primary">Back to product</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href={"/store/" + store.slug + "/products/" + product.slug} className="brand">
            <span className="brand-mark">EP</span>
            <span>{product.name}</span>
          </Link>
          <Link href="/account" className="button">My account</Link>
        </header>
        <section className="form-hero">
          <div className="kicker">Verified purchase</div>
          <h1>Review <em>{product.name}.</em></h1>
          <p className="lead">Your review enters moderation first. Published reviews remain tied to this store and product.</p>
        </section>
        <ReviewForm storeId={store.id} productId={product.id} slug={store.slug} productSlug={product.slug} />
      </div>
    </main>
  );
}
