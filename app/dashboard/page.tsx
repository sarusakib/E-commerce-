import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href="/" className="brand">E-COMMERCE <span>PREMIUM</span></Link>
          <Link href="/store/create" className="button primary">Create store</Link>
        </header>
        <section className="hero">
          <div className="kicker">Seller dashboard</div>
          <h1>Your store, <em>one control plane.</em></h1>
          <p className="lead">Products, orders, customers and analytics will be tenant-scoped.</p>
        </section>
      </div>
    </main>
  );
}
