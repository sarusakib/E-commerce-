'use client';

import { useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  currency: string;
  stock: number;
  primary_image_url?: string | null;
};

function cartKey(storeSlug: string) {
  return "ecommerce-premium:cart:" + storeSlug;
}

export default function AddToCartButton({
  storeSlug,
  product,
}: {
  storeSlug: string;
  product: Product;
}) {
  const [added, setAdded] = useState(false);

  function addToCart() {
    if (product.stock <= 0) return;

    try {
      const key = cartKey(storeSlug);
      const existing = JSON.parse(window.localStorage.getItem(key) || "[]") as Array<{
        productId: string;
        name: string;
        slug: string;
        price: number;
        currency: string;
        stock: number;
        image: string | null;
        quantity: number;
      }>;

      const match = existing.find((item) => item.productId === product.id);

      if (match) {
        match.quantity = Math.min(match.quantity + 1, product.stock);
        match.stock = product.stock;
      } else {
        existing.push({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          currency: product.currency,
          stock: product.stock,
          image: product.primary_image_url ?? null,
          quantity: 1,
        });
      }

      window.localStorage.setItem(key, JSON.stringify(existing));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } catch {
      // Local cart is a convenience layer; checkout will revalidate server-side later.
    }
  }

  return (
    <button
      className="button primary"
      type="button"
      onClick={addToCart}
      disabled={product.stock <= 0}
    >
      {product.stock <= 0
        ? "Currently unavailable"
        : added
          ? "Added to cart"
          : "Add to cart"}
    </button>
  );
}
