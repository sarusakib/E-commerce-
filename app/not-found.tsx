import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <div className="page">
        <section className="empty-card not-found-card">
          <div className="kicker">404</div>
          <h1>This page <em>does not exist.</em></h1>
          <p>Check the URL or return to E-Commerce Premium home.</p>
          <Link className="button primary" href="/">Back home</Link>
        </section>
      </div>
    </main>
  );
}
