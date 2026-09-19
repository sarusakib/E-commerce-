import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTeamInvite, revokeTeamInvite } from "./actions";

export const dynamic = "force-dynamic";

function pick(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStore = pick(params.store);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id,name,slug")
    .order("created_at", { ascending: false });

  const selected = stores?.find((store) => store.id === requestedStore) ?? stores?.[0];

  const [{ data: members }, { data: invites }] = selected
    ? await Promise.all([
        supabase
          .from("store_members")
          .select("user_id,role,permissions,created_at")
          .eq("store_id", selected.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("store_invitations")
          .select("id,email,role,expires_at,accepted_at,created_at")
          .eq("store_id", selected.id)
          .order("created_at", { ascending: false })
          .limit(100),
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
            <Link href="/dashboard/orders" className="button">Orders</Link>
            <Link href="/dashboard/products" className="button">Products</Link>
            <Link href="/dashboard" className="button">Dashboard</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Seller team</div>
          <h1>Work <em>together.</em></h1>
          <p className="lead">Store membership, role and invitation boundaries are enforced by Supabase RLS.</p>
        </section>

        {!stores?.length ? (
          <section className="empty-card">
            <h2>Create a store first.</h2>
            <p>Team members belong to a specific storefront.</p>
            <Link href="/store/create" className="button primary">Create store</Link>
          </section>
        ) : (
          <>
            <div className="store-switcher">
              {stores.map((store) => (
                <Link key={store.id} href={"/dashboard/team?store=" + store.id} className={store.id === selected?.id ? "store-switch active" : "store-switch"}>{store.name}</Link>
              ))}
            </div>

            <section className="store-form">
              <div className="form-section-title">Invite someone to {selected?.name}</div>
              <form action={createTeamInvite} className="auth-form">
                <input type="hidden" name="store_id" value={selected!.id} />
                <div className="form-grid">
                  <label><span>Email</span><input type="email" name="email" maxLength={254} required /></label>
                  <label>
                    <span>Role</span>
                    <select name="role" defaultValue="staff">
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="product_manager">Product Manager</option>
                      <option value="order_manager">Order Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                  </label>
                </div>
                <button className="button primary" type="submit">Create invitation</button>
              </form>
              <p className="checkout-note">Invitation links expire after 72 hours and contain a token hash only in the database.</p>
            </section>

            <section className="team-grid">
              <div className="store-form">
                <div className="form-section-title">Members</div>
                <div className="member-list">
                  {(members ?? []).map((member) => (
                    <div className="member-row" key={member.user_id}>
                      <div><strong>{member.user_id === auth.user.id ? "You" : member.user_id}</strong><small>{member.role}</small></div>
                      <span>{new Date(member.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {!members?.length && <p className="checkout-note">No team members found.</p>}
                </div>
              </div>

              <div className="store-form">
                <div className="form-section-title">Invitations</div>
                <div className="member-list">
                  {(invites ?? []).map((invite) => (
                    <div className="member-row" key={invite.id}>
                      <div><strong>{invite.email}</strong><small>{invite.role} · {invite.accepted_at ? "Accepted" : "Pending"}</small></div>
                      {!invite.accepted_at && new Date(invite.expires_at) > new Date() && (
                        <form action={revokeTeamInvite}>
                          <input type="hidden" name="invite_id" value={invite.id} />
                          <input type="hidden" name="store_id" value={selected!.id} />
                          <button className="button danger-button" type="submit">Revoke</button>
                        </form>
                      )}
                    </div>
                  ))}
                  {!invites?.length && <p className="checkout-note">No invitations yet.</p>}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
