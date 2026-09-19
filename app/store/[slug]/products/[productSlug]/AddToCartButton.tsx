'use client';

import { useMemo, useState } from "react";

type Variant = {
  id: string;
  title: string;
  price: number | string;
  stock: number;
  sku: string | null;
  image_url: string | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  currency: string;
  stock: number;
  primary_image_url?: string | null;
};

export default function AddToCartButton({
  storeSlug,
  product,
  variants = [],
}: {
  storeSlug: string;
  product: Product;
  variants?: Variant[];
}) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = useMemo(
    () => variants.find((variant) => variant.id === variantId) ?? null,
    [variantId, variants],
  );

  const price = selected ? Number(selected.price) : Number(product.price);
  const stock = selected ? selected.stock : product.stock;
  const key = "ecommerce-premium:cart:" + storeSlug;

  function addToCart() {
    if (stock <= 0) return;

    try {
      const existing = JSON.parse(window.localStorage.getItem(key) || "[]") as Array<{
        productId: string;
        variantId: string | null;
        name: string;
        variantTitle?: string;
        slug: string;
        price: number;
        currency: string;
        stock: number;
        image: string | null;
        quantity: number;
      }>;

      const match = existing.find(
        (item) => item.productId === product.id && item.variantId === (selected?.id ?? null),
      );

      if (match) {
        match.quantity = Math.min(match.quantity + quantity, stock);
        match.stock = stock;
        match.price = price;
      } else {
        existing.push({
          productId: product.id,
          variantId: selected?.id ?? null,
          name: product.name,
          variantTitle: selected?.title,
          slug: product.slug,
          price,
          currency: product.currency,
          stock,
          image: selected?.image_url ?? product.primary_image_url ?? null,
          quantity: Math.min(quantity, stock),
        });
      }

      window.localStorage.setItem(key, JSON.stringify(existing));
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } catch {
      // Local storage is a convenience cache; final checkout revalidates server-side.
    }
  }

  return (
    <div className="purchase-panel">
      {variants.length > 0 && (
        <label>
          <span>Variant</span>
          <select value={variantId} onChange={(event) => {
            setVariantId(event.target.value);
            setQuantity(1);
          }}>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
                {variant.title} · {variant.currency ?? ""} {Number(variant.price).toFixed(2)}
                {variant.stock <= 0 ? " · Out of stock" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="quantity-row">
        <span>Quantity</span>
        <div className="qty-stepper">
          <button type="button" className="qty-button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={stock <= 0}>−</button>
          <strong>{quantity}</strong>
          <button type="button" className="qty-button" onClick={() => setQuantity((value) => Math.min(stock, value + 1))} disabled={stock <= 0}>+</button>
        </div>
        <span className="stock-note">{stock > 0 ? stock + " available" : "Out of stock"}</span>
      </div>

      <button className="button primary" type="button" onClick={addToCart} disabled={stock <= 0}>
        {stock <= 0 ? "Currently unavailable" : added ? "Added to cart" : "Add to cart"}
      </button>
    </div>
  );
}
