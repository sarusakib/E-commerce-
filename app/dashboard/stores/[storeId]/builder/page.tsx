import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuilderForm from "./BuilderForm";

export const dynamic = "force-dynamic";

export default async function StoreBuilderPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ data: store }, { data: settings }] = await Promise.all([
    supabase
      .from("stores")
      .select("id,name,slug,description")
      .eq("id", storeId)
      .maybeSingle(),
    supabase
      .from("store_public_settings")
      .select("theme,homepage,announcement")
      .eq("store_id", storeId)
      .maybeSingle(),
  ]);

  if (!store) notFound();

  const theme = settings?.theme && typeof settings.theme === "object"
    ? settings.theme as Record<string, unknown>
    : {};
  const homepage = settings?.homepage && typeof settings.homepage === "object"
    ? settings.homepage as Record<string, unknown>
    : {};
  const sections = Array.isArray(homepage.sections)
    ? homepage.sections.filter((value): value is string => typeof value === "string")
    : ["hero", "featured_products", "about", "faq"];

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-Commerce <b>Premium</b></span>
          </Link>
          <div className="nav-actions">
            <Link href={"/store/" + store.slug} className="button">Preview</Link>
            <Link href="/dashboard" className="button">Dashboard</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Store Builder</div>
          <h1>Design your <em>storefront.</em></h1>
          <p className="lead">Build a modular homepage without touching the tenant identity or commerce data.</p>
        </section>

        <BuilderForm
          storeId={store.id}
          initial={{
            name: store.name,
            description: store.description,
            heroTitle: typeof homepage.hero_title === "string" ? homepage.hero_title : store.name,
            heroSubtitle: typeof homepage.hero_subtitle === "string" ? homepage.hero_subtitle : "Independent commerce, designed for your brand.",
            announcement: settings?.announcement ?? "",
            preset: typeof theme.preset === "string" ? theme.preset : "aura",
            accent: typeof theme.accent === "string" ? theme.accent : "#73edff",
            sections,
          }}
        />
      </div>
    </main>
  );
}
