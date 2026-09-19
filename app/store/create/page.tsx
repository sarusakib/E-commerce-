import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateStoreForm from "./CreateStoreForm";

export const dynamic = "force-dynamic";

export default async function CreateStorePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href="/" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <Link href="/dashboard" className="button">Dashboard</Link>
        </header>

        <section className="form-hero">
          <div className="kicker">Store provisioning</div>
          <h1>Create your <em>independent storefront.</em></h1>
          <p className="lead">
            Your store URL, currency, language and timezone become the base configuration.
            You can extend the store later without changing its tenant identity.
          </p>
        </section>

        <CreateStoreForm />
      </div>
    </main>
  );
}
