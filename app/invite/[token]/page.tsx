import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AcceptInviteButton from "./AcceptInviteButton";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?next=" + encodeURIComponent("/invite/" + token));
  }

  return (
    <main className="shell">
      <div className="page">
        <section className="auth-card compact">
          <div className="auth-brand">
            <span className="logo-mark">EP</span>
            <div>
              <strong>E-Commerce Premium</strong>
              <span>Team invitation</span>
            </div>
          </div>
          <div className="auth-heading">
            <div className="kicker">Secure invitation</div>
            <h1>Join a store team.</h1>
            <p>This invitation can only be accepted by the email address it was issued to.</p>
          </div>
          <AcceptInviteButton token={token} />
          <div className="actions">
            <Link href="/dashboard" className="button">Dashboard</Link>
            <Link href="/" className="button">Home</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
