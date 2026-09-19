import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecommerce-premium.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "E-Commerce Premium",
    template: "%s — E-Commerce Premium",
  },
  description: "Independent premium storefronts, built for modern commerce.",
  applicationName: "E-Commerce Premium",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "E-Commerce Premium",
    title: "E-Commerce Premium",
    description: "Build. Sell. Grow. With your own independent digital store.",
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
      <body>{children}</body>
    </html>
  );
}
