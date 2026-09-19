import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DomainForm from "./DomainForm";
import { verifyCustomDomain } from "./actions";

export const dynamic = "force-dynamic";

function pick(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function DomainsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = pick(params.store);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id,name,slug")
    .order("created_at", { ascending: false });

  const selected = stores?.find((store) => store.id === requested) ?? stores?.[0];

  const { data: domains, error } = selected
    ? await supabase
        .from("custom_domains")
        .select("id,hostname,status,verified_at,created_at")
        .eq("store_id", selected.id)
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
            <Link href="/dashboard/team" className="button">Team</Link>
            <Link href="/dashboard" className="button">Dashboard</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Domains</div>
          <h1>Bring your <em>brand home.</em></h1>
          <p className="lead">Custom domains map to the same store identity; changing a domain never changes store ownership or product IDs.</p>
        </section>

        {!stores?.length ? (
          <section className="empty-card">
            <h2>Create a store first.</h2>
            <p>A custom domain belongs to a specific store.</p>
            <Link href="/store/create" className="button primary">Create store</Link>
          </section>
        ) : (
          <>
            <div className="store-switcher">
              {stores.map((store) => (
                <Link key={store.id} href={"/dashboard/domains?store=" + store.id} className={store.id === selected?.id ? "store-switch active" : "store-switch"}>
                  {store.name}
                </Link>
              ))}
            </div>

            <DomainForm storeId={selected!.id} />

            <section className="domain-list">
              {(domains ?? []).map((domain) => (
                <article className="domain-card" key={domain.id}>
                  <div>
                    <span className="feature-index">DOMAIN</span>
                    <h2>{domain.hostname}</h2>
                    <p>{domain.status} · {domain.verified_at ? "Verified " + new Date(domain.verified_at).toLocaleString() : "Verification pending"}</p>
                  </div>
                  {domain.status === "pending" ? (
                    <form action={verifyCustomDomain}>
                      <input type="hidden" name="domain_id" value={domain.id} />
                      <input type="hidden" name="store_id" value={selected!.id} />
                      <button className="button primary" type="submit">Verify DNS</button>
                    </form>
                  ) : (
                    <span className="status-pill status-active">Active</span>
                  )}
                </article>
              ))}
              {!domains?.length && <section className="empty-card"><p>No custom domains yet.</p></section>}
            </section>

            {error && <div className="alert error">Could not load custom domains.</div>}
          </>
        )}
      </div>
    </main>
  );
}
