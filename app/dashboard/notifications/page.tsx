import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id,type,title,body,data,read_at,created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href="/dashboard" className="brand"><span className="brand-mark">EP</span><span>E-COMMERCE <b>PREMIUM</b></span></Link>
          <div className="nav-actions"><Link href="/dashboard/orders" className="button">Orders</Link><Link href="/dashboard" className="button">Dashboard</Link></div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Notifications</div>
          <h1>Stay <em>in control.</em></h1>
          <p className="lead">Security, order and commerce events for stores you manage appear here.</p>
        </section>

        {error ? (
          <div className="alert error">Could not load notifications.</div>
        ) : !notifications?.length ? (
          <section className="empty-card"><p>No notifications yet.</p></section>
        ) : (
          <section className="notification-list">
            {notifications.map((notification) => (
              <article className={notification.read_at ? "notification-card read" : "notification-card unread"} key={notification.id}>
                <div className="notification-dot" aria-hidden="true" />
                <div className="notification-copy">
                  <div className="notification-head">
                    <h2>{notification.title}</h2>
                    <span>{new Date(notification.created_at).toLocaleString()}</span>
                  </div>
                  <p>{notification.body}</p>
                </div>
                {!notification.read_at && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="notification_id" value={notification.id} />
                    <button type="submit" className="button">Mark read</button>
                  </form>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
