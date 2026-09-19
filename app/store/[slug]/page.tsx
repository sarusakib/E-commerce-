export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <main className="shell">
      <div className="page">
        <section className="hero">
          <div className="kicker">Independent storefront</div>
          <h1>{slug} <em>store.</em></h1>
          <p className="lead">
            This tenant route is resolved from the request host. Product catalog and store
            configuration will be loaded from Supabase after the project is connected.
          </p>
        </section>
      </div>
    </main>
  );
}
