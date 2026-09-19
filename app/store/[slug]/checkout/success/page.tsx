import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getConfirmation(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const response = await fetch(
    url + "/functions/v1/create-order?token=" + encodeURIComponent(token),
    {
      headers: { apikey: key },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  return response.json() as Promise<{
    found: boolean;
    order_number?: string;
    status?: string;
    payment_status?: string;
    currency?: string;
    grand_total?: number;
    customer_email?: string;
    store_name?: string;
    created_at?: string;
    tracking_number?: string | null;
    items?: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
  }>;
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const confirmation = token ? await getConfirmation(token) : null;

  if (!confirmation?.found) notFound();

  return (
    <main className="storefront-shell">
      <div className="page">
        <header className="nav">
          <Link href={"/store/" + slug} className="brand">
            <span className="brand-mark">EP</span>
            <span>{confirmation.store_name}</span>
          </Link>
          <Link href={"/store/" + slug} className="button">Continue shopping</Link>
        </header>

        <section className="success-hero">
          <div className="kicker">Order confirmed</div>
          <h1>Thank you. <em>Your order is placed.</em></h1>
          <p className="lead">
            Order #{confirmation.order_number}. A confirmation reference has been created for this purchase.
          </p>
        </section>

        <section className="success-grid">
          <div className="store-form">
            <div className="form-section-title">Order summary</div>
            {(confirmation.items ?? []).map((item, index) => (
              <div className="checkout-item" key={index}>
                <div>
                  <strong>{item.product_name}</strong>
                  <span>Qty {item.quantity}</span>
                </div>
                <span>{confirmation.currency} {Number(item.line_total).toFixed(2)}</span>
              </div>
            ))}
            <div className="cart-total-row">
              <span>Total</span>
              <strong>{confirmation.currency} {Number(confirmation.grand_total).toFixed(2)}</strong>
            </div>
          </div>

          <aside className="store-form">
            <div className="form-section-title">Status</div>
            <div className="detail-stack">
              <div><span>Order</span><strong>#{confirmation.order_number}</strong></div>
              <div><span>Fulfillment</span><strong>{confirmation.status}</strong></div>
              <div><span>Payment</span><strong>{String(confirmation.payment_status).replace("_", " ")}</strong></div>
              <div><span>Email</span><strong>{confirmation.customer_email}</strong></div>
              <div><span>Tracking</span><strong>{confirmation.tracking_number || "Added after dispatch"}</strong></div>
            </div>
            <p className="checkout-note">
              Cash-on-delivery orders remain unpaid until the seller/provider records payment completion.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
