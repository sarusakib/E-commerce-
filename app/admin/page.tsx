import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformFeatureKey } from "@/lib/commerce/core";
import { requirePlatformAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  try { await requirePlatformAdmin(supabase); } catch { redirect("/dashboard"); }

  const admin = createAdminClient();

  async function toggleFeatureFlag(formData: FormData) {
    "use server";
    const key = String(formData.get("key") ?? "");
    const enabled = String(formData.get("enabled") ?? "") === "true";
    if (!isPlatformFeatureKey(key)) throw new Error("Unknown feature flag.");

    const secureClient = await createClient();
    await requirePlatformAdmin(secureClient);
    const adminClient = createAdminClient();

    const { data: current } = await adminClient
      .from("platform_feature_flags").select("config").eq("key", key).maybeSingle();
    const { error } = await adminClient.from("platform_feature_flags")
      .upsert({ key, enabled, config: current?.config ?? {} });
    if (error) throw new Error("Feature flag could not be updated.");
  }

  const [stores,products,orders,customers,flags] = await Promise.all([
    admin.from("stores").select("id",{count:"exact",head:true}),
    admin.from("products").select("id",{count:"exact",head:true}),
    admin.from("orders").select("id",{count:"exact",head:true}),
    admin.from("customers").select("id",{count:"exact",head:true}),
    admin.from("platform_feature_flags").select("key,enabled,config").order("key"),
  ]);

  return <main className="shell"><div className="page dashboard-page">
    <header className="nav">
      <Link href="/dashboard/master" className="brand"><span className="brand-mark">EP</span><span>PLATFORM <b>ADMIN</b></span></Link>
      <Link href="/dashboard" className="button">Dashboard</Link>
    </header>
    <section className="dashboard-intro"><div className="kicker">Platform administration</div><h1>Control the <em>ecosystem.</em></h1>
      <p className="lead">Platform controls stay outside seller tenants. Secrets are never rendered in this dashboard.</p>
    </section>
    <section className="metric-grid">
      <article className="metric-card"><span>Stores</span><strong>{stores.count??0}</strong></article>
      <article className="metric-card"><span>Products</span><strong>{products.count??0}</strong></article>
      <article className="metric-card"><span>Orders</span><strong>{orders.count??0}</strong></article>
      <article className="metric-card"><span>Customers</span><strong>{customers.count??0}</strong></article>
    </section>
    <section className="store-form" style={{maxWidth:"none",marginTop:14}}>
      <div className="form-section-title">Feature flags</div>
      {(flags.data??[]).map((flag) => <div key={flag.key} className="admin-product-row" style={{paddingLeft:0,paddingRight:0}}>
        <div><strong>{flag.key}</strong><small>{flag.enabled?"Enabled":"Disabled"}</small></div><span/><span/><span/>
        <form action={toggleFeatureFlag}><input type="hidden" name="key" value={flag.key}/><input type="hidden" name="enabled" value={String(!flag.enabled)}/><button className="button" type="submit">{flag.enabled?"Disable":"Enable"}</button></form>
      </div>)}
    </section>
  </div></main>;
}
