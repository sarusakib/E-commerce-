import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moderateReviewAction } from "./actions";

export const dynamic = "force-dynamic";

function pick(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function ReviewsDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStoreId = pick(params.store);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stores } = await supabase.from("stores").select("id,name,slug").order("created_at", { ascending: false });
  const selected = stores?.find((store) => store.id === requestedStoreId) ?? stores?.[0];

  const { data: reviews, error } = selected
    ? await supabase
        .from("product_reviews")
        .select("id,product_id,rating,title,body,verified_purchase,status,seller_response,created_at")
        .eq("store_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href="/dashboard" className="brand"><span className="brand-mark">EP</span><span>E-COMMERCE <b>PREMIUM</b></span></Link>
          <div className="nav-actions"><Link href="/dashboard/coupons" className="button">Coupons</Link><Link href="/dashboard" className="button">Dashboard</Link></div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Trust & moderation</div>
          <h1>Product <em>reviews.</em></h1>
          <p className="lead">Only delivered-order customers can submit verified reviews. Publishing remains a seller moderation decision.</p>
        </section>

        <div className="store-switcher">
          {(stores ?? []).map((store) => (
            <Link key={store.id} href={"/dashboard/reviews?store=" + store.id} className={store.id === selected?.id ? "store-switch active" : "store-switch"}>{store.name}</Link>
          ))}
        </div>

        {error ? (
          <div className="alert error">Could not load reviews.</div>
        ) : !reviews?.length ? (
          <section className="empty-card"><p>No reviews yet.</p></section>
        ) : (
          <section className="review-list">
            {reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-head">
                  <div>
                    <span className="feature-index">REVIEW</span>
                    <h2>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</h2>
                  </div>
                  <span className={"status-pill review-" + review.status}>{review.status}</span>
                </div>
                <h3>{review.title || "Customer review"}</h3>
                <p>{review.body}</p>
                {review.verified_purchase && <span className="verified-badge">Verified purchase</span>}
                <form action={moderateReviewAction} className="review-moderation-form">
                  <input type="hidden" name="review_id" value={review.id} />
                  <input type="hidden" name="store_slug" value={selected?.slug ?? ""} />
                  <label><span>Status</span><select name="status" defaultValue={review.status}><option value="pending">Pending</option><option value="published">Published</option><option value="rejected">Rejected</option><option value="hidden">Hidden</option></select></label>
                  <label><span>Seller response</span><textarea name="seller_response" rows={4} defaultValue={review.seller_response ?? ""} maxLength={2000} /></label>
                  <button className="button primary" type="submit">Save moderation</button>
                </form>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
