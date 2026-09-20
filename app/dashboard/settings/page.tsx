import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StoreSettingsForm from "./StoreSettingsForm";

export const dynamic = "force-dynamic";

function pick(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStoreId = pick(params.store);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stores, error } = await supabase.from("stores")
    .select("id,name,slug,description,default_currency,locale,timezone,country_code")
    .order("created_at", { ascending: false });

  if (error) {
    return <main className="shell"><div className="page"><div className="alert error">Could not load your stores.</div></div></main>;
  }

  const selected = stores?.find((store) => store.id === requestedStoreId) ?? stores?.[0];
  if (!selected) {
    return <main className="shell"><div className="page"><section className="empty-card not-found-card">
      <div className="kicker">Store settings</div><h1>Create a <em>store first.</em></h1>
      <Link className="button primary" href="/store/create">Create store</Link>
    </section></div></main>;
  }

  const { data: publicSettings } = await supabase.from("store_public_settings")
    .select("theme,announcement").eq("store_id", selected.id).maybeSingle();
  const theme = publicSettings?.theme && typeof publicSettings.theme === "object"
    ? (publicSettings.theme as Record<string, unknown>) : {};

  return <main className="shell"><div className="page dashboard-page">
    <header className="nav">
      <Link href="/dashboard" className="brand"><span className="brand-mark">EP</span><span>E-COMMERCE <b>PREMIUM</b></span></Link>
      <div className="nav-actions">
        <Link href={"/dashboard/master?store="+selected.id} className="button">Master</Link>
        <Link href={"/store/"+selected.slug} className="button">Storefront</Link>
      </div>
    </header>
    <section className="dashboard-intro"><div className="kicker">Store configuration</div>
      <h1>Your <em>control room.</em></h1>
      <p className="lead">Tenant-safe settings for currency, language, timezone, country and public storefront presentation.</p>
    </section>
    <div className="store-switcher">{(stores ?? []).map((store) =>
      <Link key={store.id} href={"/dashboard/settings?store="+store.id}
        className={store.id===selected.id ? "store-switch active" : "store-switch"}>{store.name}</Link>
    )}</div>
    <StoreSettingsForm storeId={selected.id} slug={selected.slug} initial={{
      name:selected.name, description:selected.description, currency:selected.default_currency, locale:selected.locale,
      timezone:selected.timezone, countryCode:selected.country_code, announcement:publicSettings?.announcement ?? "",
      accent:typeof theme.accent==="string" && /^#[0-9a-f]{6}$/i.test(theme.accent) ? theme.accent : "#73edff",
    }} />
  </div></main>;
}
