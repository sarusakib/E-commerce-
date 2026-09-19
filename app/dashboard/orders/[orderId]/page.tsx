import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateOrderAction } from "../actions";

export const dynamic = "force-dynamic";

const statusOptions = ["pending","confirmed","processing","shipped","delivered","cancelled","returned","refunded"];
const paymentOptions = ["unpaid","pending","paid","failed","partially_refunded","refunded"];

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orderId } = await params;
  const qs = await searchParams;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("id,store_id,order_number,status,payment_status,currency,subtotal,discount_total,tax_total,shipping_total,grand_total,customer_email,customer_phone,shipping_address,billing_address,notes,tracking_number,payment_provider,payment_reference,created_at,updated_at")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const [{ data: items }, { data: store }, { data: events }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id,product_id,variant_id,product_name,sku,quantity,unit_price,discount_total,tax_total,line_total")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("stores")
      .select("id,name,slug")
      .eq("id", order.store_id)
      .maybeSingle(),
    supabase
      .from("order_events")
      .select("id,event_type,payload,created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!store) notFound();

  const address = order.shipping_address && typeof order.shipping_address === "object"
    ? order.shipping_address as Record<string, unknown>
    : {};

  return (
    <main className="shell">
      <div className="page dashboard-page">
        <header className="nav">
          <Link href={"/dashboard/orders?store=" + store.id} className="brand">
            <span className="brand-mark">EP</span>
            <span>{store.name} orders</span>
          </Link>
          <div className="nav-actions">
            <Link href={"/store/" + store.slug} className="button">Store</Link>
            <Link href={"/dashboard/orders?store=" + store.id} className="button">All orders</Link>
          </div>
        </header>

        <section className="dashboard-intro">
          <div className="kicker">Order #{order.order_number}</div>
          <h1>Order <em>details.</em></h1>
          <p className="lead">{new Date(order.created_at).toLocaleString()} · {order.customer_email}</p>
        </section>

        {qs.updated === "1" && <div className="alert success" role="status">Order updated successfully.</div>}

        <section className="order-detail-grid">
          <div className="store-form">
            <div className="form-section-title">Order status</div>
            <form action={updateOrderAction} className="auth-form">
              <input type="hidden" name="order_id" value={order.id} />
              <label>
                <span>Fulfillment status</span>
                <select name="status" defaultValue={order.status}>
                  {statusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <span>Payment status</span>
                <select name="payment_status" defaultValue={order.payment_status}>
                  {paymentOptions.map((status) => <option value={status} key={status}>{status.replace("_", " ")}</option>)}
                </select>
              </label>
              <label>
                <span>Tracking number</span>
                <input name="tracking_number" defaultValue={order.tracking_number ?? ""} maxLength={120} />
              </label>
              <button className="button primary auth-submit" type="submit">Save order</button>
            </form>
          </div>

          <div className="store-form">
            <div className="form-section-title">Customer & shipping</div>
            <div className="detail-stack">
              <div><span>Email</span><strong>{order.customer_email}</strong></div>
              <div><span>Phone</span><strong>{order.customer_phone || "Not provided"}</strong></div>
              <div><span>Recipient</span><strong>{String(address.recipient_name ?? "Not provided")}</strong></div>
              <div><span>Address</span><strong>{[address.line1, address.line2, address.city, address.state, address.postal_code, address.country_code].filter(Boolean).join(", ") || "Not provided"}</strong></div>
            </div>
          </div>
        </section>

        <section className="store-form order-items-panel">
          <div className="form-section-title">Items</div>
          <div className="order-items">
            {(items ?? []).map((item) => (
              <div className="order-item-row" key={item.id}>
                <div>
                  <strong>{item.product_name}</strong>
                  <small>{item.sku || "No SKU"} · Qty {item.quantity}</small>
                </div>
                <span>{order.currency} {Number(item.unit_price).toFixed(2)}</span>
                <strong>{order.currency} {Number(item.line_total).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="order-summary-detail">
          <div><span>Subtotal</span><strong>{order.currency} {Number(order.subtotal).toFixed(2)}</strong></div>
          <div><span>Discount</span><strong>{order.currency} {Number(order.discount_total).toFixed(2)}</strong></div>
          <div><span>Tax</span><strong>{order.currency} {Number(order.tax_total).toFixed(2)}</strong></div>
          <div><span>Shipping</span><strong>{order.currency} {Number(order.shipping_total).toFixed(2)}</strong></div>
          <div className="grand"><span>Total</span><strong>{order.currency} {Number(order.grand_total).toFixed(2)}</strong></div>
        </section>

        <section className="store-form">
          <div className="form-section-title">Order timeline</div>
          <div className="timeline">
            {(events ?? []).map((event) => (
              <div className="timeline-row" key={event.id}>
                <span>{new Date(event.created_at).toLocaleString()}</span>
                <strong>{event.event_type}</strong>
              </div>
            ))}
            {!events?.length && <p>No event history yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
