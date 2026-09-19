import Link from "next/link";

const features = [
  ["Independent stores", "Each seller gets an isolated storefront and tenant boundary."],
  ["International-ready", "Currency, language, timezone, tax and shipping remain adapter-based."],
  ["Commerce core", "Products, cart, checkout and orders stay inside the seller's store context."],
];

export default function HomePage() {
  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href="/" className="brand">E-COMMERCE <span>PREMIUM</span></Link>
          <nav className="nav-links" aria-label="Primary">
            <Link href="/login">Sign in</Link>
            <Link href="/store/create">Create store</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </header>
        <section className="hero">
          <div className="kicker">Independent commerce infrastructure</div>
          <h1>Build a store that feels <em>world-class.</em></h1>
          <p className="lead">
            A multi-tenant storefront platform where every seller gets an independent brand
            experience, dedicated store context, and a scalable commerce foundation.
          </p>
          <div className="actions">
            <Link href="/store/create" className="button primary">Launch a store</Link>
            <Link href="/login" className="button">Sign in</Link>
          </div>
          <div className="status">GitHub foundation ready · Supabase adapter ready · Vercel-ready</div>
        </section>
        <section className="card-grid" aria-label="Platform capabilities">
          {features.map(([title, description]) => (
            <article className="card" key={title}>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
