import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "./SignOutButton";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) redirect("/login");

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id,name,slug,status,default_currency,locale,timezone,description,created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href="/" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <div className="nav-actions">
            <Link href="/store/create" className="button primary">Create store</Link>
            <SignOutButton />
          </div>
        </header>

        <section className="dashboard-intro">
          <div>
            <div className="kicker">Seller control plane</div>
            <h1>Good to see you.</h1>
            <p className="lead">Manage every store from one account while keeping each tenant isolated.</p>
          </div>
        </section>

        {error && <div className="alert error" role="alert">We could not load your stores. Please refresh and try again.</div>}

        {!stores?.length ? (
          <section className="empty-card">
            <span className="feature-index">01</span>
            <h2>Your first store starts here.</h2>
            <p>Create an independent storefront and get its own platform subdomain.</p>
            <Link href="/store/create" className="button primary">Create your first store</Link>
          </section>
        ) : (
          <section className="store-grid" aria-label="Your stores">
            {stores.map((store) => (
              <article className="store-card" key={store.id}>
                <div className="store-card-top">
                  <span className={"status-pill status-" + store.status}>{store.status}</span>
                  <span>{store.default_currency}</span>
                </div>
                <h2>{store.name}</h2>
                <p>{store.description || "Independent storefront ready for products and growth."}</p>
                <div className="store-url">
                  https://{store.slug}.{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "ecommerce-premium.vercel.app"}
                </div>
                <div className="actions">
                  <Link href={"/store/" + store.slug} className="button">Open store</Link>
                  <Link href={"/store/" + store.slug + "/products"} className="button">Open catalog</Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
