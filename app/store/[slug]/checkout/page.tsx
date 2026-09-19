import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import CheckoutForm from "./CheckoutForm";
import CheckoutTracker from "./CheckoutTracker";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id,name,slug,status,default_currency,country_code,locale")
    .eq("slug", slug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (!store) notFound();

  return (
    <main className="storefront-shell">
      <CheckoutTracker storeSlug={store.slug} />
      <div className="page">
        <header className="nav">
          <Link href={"/store/" + store.slug} className="brand">
            <span className="brand-mark">EP</span>
            <span>{store.name}</span>
          </Link>
          <Link href={"/store/" + store.slug + "/cart"} className="button">Back to cart</Link>
        </header>

        <section className="form-hero">
          <div className="kicker">Secure checkout</div>
          <h1>Complete your <em>order.</em></h1>
          <p className="lead">
            Product price and stock are checked again on the server before the order is created.
            Cash on delivery is the first active payment method.
          </p>
        </section>

        <CheckoutForm storeSlug={store.slug} currency={store.default_currency} />
      </div>
    </main>
  );
}
