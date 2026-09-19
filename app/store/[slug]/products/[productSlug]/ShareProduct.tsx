'use client';

import { useState } from "react";

export default function ShareProduct({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url, text: title });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sharing can be cancelled by the user; no error UI is needed.
    }
  }

  return (
    <button className="button" type="button" onClick={share}>
      {copied ? "Link copied" : "Share product"}
    </button>
  );
}
