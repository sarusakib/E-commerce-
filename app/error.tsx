"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <main className="shell">
      <div className="page">
        <section className="empty-card not-found-card">
          <div className="kicker">Something went wrong</div>
          <h1>We hit a <em>temporary error.</em></h1>
          <p>The page could not finish loading. Retry first; contact support if it persists.</p>
          <div className="actions">
            <button className="button primary" type="button" onClick={() => reset()}>Try again</button>
            <Link className="button" href="/">Home</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
