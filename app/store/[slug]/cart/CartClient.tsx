'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartItem = {
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
};

function cartKey(storeSlug: string) {
  return "ecommerce-premium:cart:" + storeSlug;
}

export default function CartClient({
  storeSlug,
  currency,
}: {
  storeSlug: string;
  currency: string;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cartKey(storeSlug));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, [storeSlug]);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(cartKey(storeSlug), JSON.stringify(items));
  }, [items, loaded, storeSlug]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  function setQuantity(productId: string, quantity: number) {
    setItems((current) =>
      current
        .map((item) => item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
          : item
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function remove(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  if (!loaded) {
    return <section className="empty-card"><p>Loading cart…</p></section>;
  }

  if (!items.length) {
    return (
      <section className="empty-card">
        <span className="feature-index">00</span>
        <h2>Your cart is empty.</h2>
        <p>Add products from this store and they will appear here.</p>
        <Link href={"/store/" + storeSlug} className="button primary">Browse products</Link>
      </section>
    );
  }

  return (
    <section className="cart-layout">
      <div className="cart-list">
        {items.map((item) => (
          <article className="cart-item" key={item.productId}>
            <div className="cart-item-image">
              {item.image ? (
                <Image src={item.image} alt="" fill sizes="100px" />
              ) : (
                <span>EP</span>
              )}
            </div>
            <div className="cart-item-copy">
              <Link href={"/store/" + storeSlug + "/products/" + item.slug}>
                <h2>{item.name}</h2>
                {item.variantTitle && <small className="cart-variant">{item.variantTitle}</small>}
              </Link>
              <span>{item.currency || currency} {item.price.toFixed(2)}</span>
              <div className="cart-controls">
                <button className="qty-button" type="button" onClick={() => setQuantity(item.productId, item.quantity - 1)} aria-label={"Decrease " + item.name}>−</button>
                <span>{item.quantity}</span>
                <button className="qty-button" type="button" onClick={() => setQuantity(item.productId, item.quantity + 1)} aria-label={"Increase " + item.name}>+</button>
                <button className="remove-button" type="button" onClick={() => remove(item.productId)}>Remove</button>
              </div>
            </div>
            <strong className="cart-line-total">
              {(item.price * item.quantity).toFixed(2)} {item.currency || currency}
            </strong>
          </article>
        ))}
      </div>

      <aside className="cart-summary">
        <div className="kicker">Order summary</div>
        <div className="cart-total-row">
          <span>Subtotal</span>
          <strong>{currency} {total.toFixed(2)}</strong>
        </div>
        <p>Shipping, taxes, discounts and payment are calculated securely during checkout.</p>
        <Link className="button primary" href={"/store/" + storeSlug + "/checkout"}>
          Continue to checkout
        </Link>
      </aside>
    </section>
  );
}
