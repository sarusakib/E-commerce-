import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createApiKey, revokeApiKey } from "./actions";
import ApiKeyForm from "./ApiKeyForm";
import WebhookForm from "./webhooks/WebhookForm";
import { disableWebhookEndpoint } from "./webhooks/actions";

export const dynamic = "force-dynamic";

function pick(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function DeveloperPage({
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

  const [{ data: keys }, { data: endpoints }] = selected
    ? await Promise.all([
        supabase
          .from("api_keys")
          .select("id,name,key_prefix,scopes,last_used_at,revoked_at,created_at")
          .eq("store_id", selected.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("webhook_endpoints")
          .select("id,url,events,active,last_delivery_at,created_at")
          .eq("store_id", selected.id)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

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
            <Link href="/dashboard/domains" className="button">Domains</Link>
            <Link href="/dashboard" className="button">Dashboard</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Developer center</div>
          <h1>Build beyond the <em>store.</em></h1>
          <p className="lead">API keys and webhook endpoints stay scoped to one store. Secrets are shown only at creation time.</p>
        </section>

        {!stores?.length ? (
          <section className="empty-card">
            <h2>Create a store first.</h2>
            <p>Developer credentials belong to a specific storefront.</p>
            <Link href="/store/create" className="button primary">Create store</Link>
          </section>
        ) : (
          <>
            <div className="store-switcher">
              {stores.map((store) => (
                <Link key={store.id} href={"/dashboard/developer?store=" + store.id} className={store.id === selected?.id ? "store-switch active" : "store-switch"}>
                  {store.name}
                </Link>
              ))}
            </div>

            <section className="store-form">
              <div className="form-section-title">Create API key · {selected?.name}</div>
              <ApiKeyForm storeId={selected!.id} />
            </section>

            <section className="store-form">
              <div className="form-section-title">Create webhook endpoint</div>
              <WebhookForm storeId={selected!.id} />
            </section>

            <section className="developer-list">
              <div className="developer-list-head">
                <h2>Webhook endpoints</h2>
                <span>Events are queued transactionally for async delivery.</span>
              </div>
              {(endpoints ?? []).map((endpoint) => (
                <article className="developer-card" key={endpoint.id}>
                  <div>
                    <strong>{endpoint.url}</strong>
                    <small>{endpoint.active ? "Active" : "Disabled"} · events: {endpoint.events.join(", ")}</small>
                  </div>
                  {endpoint.active ? (
                    <form action={disableWebhookEndpoint}>
                      <input type="hidden" name="endpoint_id" value={endpoint.id} />
                      <input type="hidden" name="store_id" value={selected!.id} />
                      <button className="button danger-button" type="submit">Disable</button>
                    </form>
                  ) : (
                    <span className="status-pill">inactive</span>
                  )}
                </article>
              ))}
              {!endpoints?.length && <p className="checkout-note">No webhook endpoints yet.</p>}
            </section>            </section>
          </>
        )}
      </div>
    </main>
  );
}
