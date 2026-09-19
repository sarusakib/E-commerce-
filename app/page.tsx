import Link from "next/link";

const pillars = [
  ["Independent stores", "Every seller gets a dedicated storefront, URL space and tenant boundary."],
  ["Commerce foundation", "Products, carts, orders and future payments stay scoped to the correct store."],
  ["Built to expand", "AI, 3D, analytics, custom domains, team roles and integrations plug into the same core."],
];

export default function HomePage() {
  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href="/" className="brand" aria-label="E-Commerce Premium home">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <Link href="/login">Sign in</Link>
            <Link href="/store/create">Create store</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </header>

        <section className="hero landing-hero">
          <div className="hero-orb orb-one" aria-hidden="true" />
          <div className="hero-orb orb-two" aria-hidden="true" />
          <div className="kicker">Independent commerce infrastructure</div>
          <h1>Build a store that feels <em>world-class.</em></h1>
          <p className="lead">
            Create an independent digital storefront for your brand—then grow it with a
            commerce system designed for international expansion, secure multi-tenancy and AI-ready modules.
          </p>
          <div className="actions">
            <Link href="/store/create" className="button primary">Launch your store</Link>
            <Link href="/login" className="button">Sign in</Link>
          </div>
          <div className="hero-meta">
            <span>360px → 4K</span>
            <span>Multi-store accounts</span>
            <span>Social-ready product URLs</span>
          </div>
        </section>

        <section className="feature-grid" aria-label="Platform pillars">
          {pillars.map(([title, description], index) => (
            <article className="feature-card" key={title}>
              <span className="feature-index">0{index + 1}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>

        <section className="roadmap">
          <div>
            <div className="kicker">Architecture</div>
            <h2>One core. Many commerce modules.</h2>
          </div>
          <p>
            Store Builder · Products · Checkout · Orders · Customers · Analytics · AI · 3D ·
            Marketing · Custom Domains · API · Webhooks · PWA
          </p>
        </section>

        <footer className="footer">
          <span>© {new Date().getFullYear()} E-Commerce Premium</span>
          <span>Build · Sell · Grow</span>
        </footer>
      </div>
    </main>
  );
}
