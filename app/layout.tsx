import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecommerce-premium.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "E-Commerce Premium", template: "%s — E-Commerce Premium" },
  description: "Independent premium storefronts, built for modern commerce.",
  applicationName: "E-Commerce Premium",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: "E-Commerce Premium",
    title: "E-Commerce Premium",
    description: "Independent premium storefronts, built for modern commerce.",
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Commerce Premium",
    description: "Independent premium storefronts, built for modern commerce.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script id="pwa-register" strategy="afterInteractive">
          {"if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {}); }"}
        </Script>
      </body>
    </html>
  );
}
