import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import CartClient from "./CartClient";

export const dynamic = "force-dynamic";

export default async function CartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id,name,slug,status,default_currency")
    .eq("slug", slug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (!store) notFound();

  return (
    <main className="storefront-shell">
      <div className="page">
        <header className="nav">
          <Link href={"/store/" + store.slug} className="brand">
            <span className="brand-mark">EP</span>
            <span>{store.name}</span>
          </Link>
          <Link href={"/store/" + store.slug} className="button">Continue shopping</Link>
        </header>
        <section className="form-hero">
          <div className="kicker">Your cart</div>
          <h1>{store.name} <em>cart.</em></h1>
          <p className="lead">This cart belongs only to this store. Products from other stores remain separate.</p>
        </section>
        <CartClient storeSlug={store.slug} currency={store.default_currency} />
      </div>
    </main>
  );
}
