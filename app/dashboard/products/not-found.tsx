import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="shell">
      <div className="page">
        <section className="empty-card not-found-card">
          <div className="kicker">Product</div>
          <h1>Product not found.</h1>
          <p>The product may have been deleted, archived, or you may not have access to its store.</p>
          <Link href="/dashboard/products" className="button primary">Back to products</Link>
        </section>
      </div>
    </main>
  );
}
