import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-Commerce Premium",
    short_name: "E-Commerce",
    description: "Independent premium storefront infrastructure.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070c",
    theme_color: "#73edff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  };
}
