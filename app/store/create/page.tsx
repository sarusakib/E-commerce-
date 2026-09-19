import Link from "next/link";

export default function CreateStorePage() {
  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href="/" className="brand">E-COMMERCE <span>PREMIUM</span></Link>
          <Link href="/dashboard" className="button">Dashboard</Link>
        </header>
        <section className="hero">
          <div className="kicker">Store provisioning</div>
          <h1>Create your <em>independent storefront.</em></h1>
          <p className="lead">The production flow will validate a unique slug and create a tenant-owned store record.</p>
        </section>
      </div>
    </main>
  );
}
