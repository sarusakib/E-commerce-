import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMMERCE_MODULES } from "@/lib/commerce/core";

export const dynamic = "force-dynamic";

const controls = [
  ["Settings","/dashboard/settings","Store configuration"],
  ["Products","/dashboard/products","Catalog and variants"],
  ["Orders","/dashboard/orders","Order operations"],
  ["Customers","/dashboard/customers","Customer records"],
  ["Analytics","/dashboard/analytics","Funnel and revenue"],
  ["Team","/dashboard/team","Roles and invitations"],
  ["Domains","/dashboard/domains","Custom hostnames"],
  ["Developer","/dashboard/developer","API keys and webhooks"],
  ["Notifications","/dashboard/notifications","Operational alerts"],
];

function pick(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function MasterControlPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStoreId = pick(params.store);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ data: stores }, { data: profile }] = await Promise.all([
    supabase.from("stores").select("id,name").order("created_at",{ascending:false}),
    supabase.from("profiles").select("platform_role").eq("id",auth.user.id).maybeSingle(),
  ]);
  const selected = stores?.find((store)=>store.id===requestedStoreId) ?? stores?.[0];

  return <main className="shell"><div className="page dashboard-page">
    <header className="nav">
      <Link href="/dashboard" className="brand"><span className="brand-mark">EP</span><span>E-COMMERCE <b>PREMIUM</b></span></Link>
      <div className="nav-actions">
        {profile?.platform_role==="admin" && <Link href="/admin" className="button">Platform admin</Link>}
        <Link href="/dashboard" className="button">Dashboard</Link>
      </div>
    </header>
    <section className="dashboard-intro"><div className="kicker">Master control plane</div><h1>One core. <em>Every module.</em></h1>
      <p className="lead">All store controls live here, while provider-dependent capabilities remain explicitly marked.</p>
    </section>
    {selected ? <section className="feature-grid">{controls.map(([label,href,detail]) =>
      <article className="feature-card" key={href}><span className="feature-index">CONTROL</span><h2>{label}</h2><p>{detail}</p>
        <div className="actions"><Link className="button" href={href+"?store="+selected.id}>Open</Link></div>
      </article>
    )}</section> : <section className="empty-card"><h2>Create your first store.</h2><p>The master control plane becomes active after a tenant exists.</p><Link className="button primary" href="/store/create">Create store</Link></section>}
    <section className="feature-grid">{COMMERCE_MODULES.map((module) =>
      <article className="feature-card" key={module.key}><span className="feature-index">{module.status.toUpperCase()}</span><h2>{module.title}</h2><p>{module.detail}</p></article>
    )}</section>
  </div></main>;
}
