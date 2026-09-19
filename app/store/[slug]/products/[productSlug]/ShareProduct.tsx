'use client';

import { useState } from "react";

export default function ShareProduct({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url, text: title });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // User cancellation is not an error that needs to be surfaced.
    }
  }

  return (
    <button className="button" type="button" onClick={share}>
      {copied ? "Link copied" : "Share product"}
    </button>
  );
}
