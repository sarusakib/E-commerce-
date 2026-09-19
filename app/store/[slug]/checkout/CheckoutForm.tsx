'use client';

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CartItem = {
  productId: string;
  name: string;
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

export default function CheckoutForm({
  storeSlug,
  currency,
}: {
  storeSlug: string;
  currency: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("BD");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [couponCode, setCouponCode] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cartKey(storeSlug));
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, [storeSlug]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
      const metadata = data.user?.user_metadata as { display_name?: string } | undefined;
      if (metadata?.display_name && !firstName) setFirstName(metadata.display_name.split(" ")[0] ?? "");
    });
  }, [firstName]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    if (!email.trim() || !firstName.trim() || !city.trim() || !line1.trim() || !postalCode.trim()) {
      setError("Please complete the required checkout fields.");
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();
      const idempotencyKey = crypto.randomUUID();

      const { data, error: invokeError } = await supabase.functions.invoke("create-order", {
        body: {
          store_slug: storeSlug,
          idempotency_key: idempotencyKey,
          customer: {
            email: email.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
          },
          items: items.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId,
            quantity: item.quantity,
          })),
          shipping_address: {
            country_code: countryCode,
            state: state.trim(),
            city: city.trim(),
            line1: line1.trim(),
            line2: line2.trim(),
            postal_code: postalCode.trim(),
          },
          coupon_code: couponCode.trim() || null,
          billing_address: {
            country_code: countryCode,
            state: state.trim(),
            city: city.trim(),
            line1: line1.trim(),
            line2: line2.trim(),
            postal_code: postalCode.trim(),
          },
        },
      });

      if (invokeError) {
        let functionMessage = invokeError.message;
        if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
          functionMessage = data.error;
        }
        throw new Error(functionMessage);
      }

      const result = data as {
        order_number?: string;
        confirmation_token?: string;
      };

      if (!result.order_number || !result.confirmation_token) {
        throw new Error("Checkout completed without a confirmation reference.");
      }

      window.localStorage.removeItem(cartKey(storeSlug));
      router.replace(
        "/store/" + storeSlug +
        "/checkout/success?order=" + encodeURIComponent(result.order_number) +
        "&token=" + encodeURIComponent(result.confirmation_token),
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <section className="empty-card"><p>Preparing checkout…</p></section>;
  }

  if (!items.length) {
    return (
      <section className="empty-card">
        <h2>Your cart is empty.</h2>
        <p>Add products before starting checkout.</p>
        <Link href={"/store/" + storeSlug} className="button primary">Browse products</Link>
      </section>
    );
  }

  return (
    <div className="checkout-layout">
      <form className="store-form checkout-form" onSubmit={submit}>
        <div className="form-section-title">Customer information</div>
        <div className="form-grid">
          <label>
            <span>First name *</span>
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} required autoComplete="given-name" />
          </label>
          <label>
            <span>Last name</span>
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} autoComplete="family-name" />
          </label>
          <label>
            <span>Email *</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required autoComplete="email" />
          </label>
          <label>
            <span>Phone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} autoComplete="tel" />
          </label>
        </div>

        <div className="form-section-title">Shipping address</div>
        <div className="form-grid">
          <label>
            <span>Country *</span>
            <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
              <option value="BD">Bangladesh</option>
              <option value="IN">India</option>
              <option value="AE">United Arab Emirates</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
            </select>
          </label>
          <label>
            <span>State / Region</span>
            <input value={state} onChange={(event) => setState(event.target.value)} maxLength={100} autoComplete="address-level1" />
          </label>
          <label>
            <span>City *</span>
            <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} required autoComplete="address-level2" />
          </label>
          <label>
            <span>Postal code *</span>
            <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} maxLength={20} required autoComplete="postal-code" />
          </label>
        </div>
        <label>
          <span>Address line 1 *</span>
          <input value={line1} onChange={(event) => setLine1(event.target.value)} maxLength={180} required autoComplete="address-line1" />
        </label>
        <label>
          <span>Address line 2</span>
          <input value={line2} onChange={(event) => setLine2(event.target.value)} maxLength={180} autoComplete="address-line2" />
        </label>

        <div className="form-section-title">Discount code</div>
        <label>
          <span>Coupon code</span>
          <input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} maxLength={40} placeholder="WELCOME10" autoCapitalize="characters" />
        </label>

        <div className="form-section-title">Payment method</div>
        <div className="payment-choice active">
          <div>
            <strong>Cash on delivery</strong>
            <span>Pay the seller when the order is delivered.</span>
          </div>
          <span className="payment-badge">ACTIVE</span>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}

        <button className="button primary auth-submit" type="submit" disabled={busy}>
          {busy ? "Creating secure order…" : "Place COD order"}
        </button>
        <p className="checkout-note">
          Final total is calculated by the server from the current product/variant prices and stock.
          The browser cart is never the source of truth.
        </p>
      </form>

      <aside className="cart-summary">
        <div className="kicker">Review</div>
        <div className="checkout-items">
          {items.map((item) => (
            <div className="checkout-item" key={item.productId}>
              <div>
                <strong>{item.name}</strong>
                <span>Qty {item.quantity}</span>
              </div>
              <span>{item.currency} {(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="cart-total-row">
          <span>Subtotal</span>
          <strong>{currency} {subtotal.toFixed(2)}</strong>
        </div>
        <p>Shipping and tax are currently zero-config. Provider-specific rules will be added through the internationalization modules.</p>
      </aside>
    </div>
  );
}
