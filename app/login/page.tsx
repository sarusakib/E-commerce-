import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="shell">
      <div className="page">
        <header className="nav">
          <Link href="/" className="brand">E-COMMERCE <span>PREMIUM</span></Link>
          <Link href="/" className="button">Home</Link>
        </header>
        <section className="hero">
          <div className="kicker">Secure account access</div>
          <h1>Sign in to your <em>commerce OS.</em></h1>
          <p className="lead">
            Authentication is wired for Supabase SSR cookies; the next step is enabling
            email/password and OAuth against the dedicated E-Commerce project.
          </p>
        </section>
      </div>
    </main>
  );
}
