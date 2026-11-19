"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useShop } from "@/context/ShopContext";
import { formatDate, formatINR } from "@/lib/format";
import type { OrderStatus } from "@/types";

const STEPS: { id: OrderStatus; label: string }[] = [
  { id: "placed", label: "Order placed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
];

const payLabel: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  wallet: "Wallet",
  cod: "Cash on delivery",
};

function OrderInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const confirmed = search.get("confirmed") === "1";
  const { getOrder, advanceOrderDemo, ready } = useShop();
  const order = getOrder(params.id);

  if (!ready) return <div className="section text-ink/50">Loading…</div>;

  if (!order) {
    return (
      <div className="section text-center">
        <h1 className="font-display text-3xl">Order not found</h1>
        <p className="mt-2 text-ink/60">It may be from another browser profile.</p>
        <Link href="/orders" className="btn-primary mt-6 inline-flex">
          View orders
        </Link>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === order.status);

  return (
    <div className="section !pt-8">
      {confirmed && (
        <div className="mb-6 rounded-sm border border-lagoon/30 bg-mist/80 px-4 py-3 text-sea reveal">
          <p className="font-display text-xl">Order confirmed</p>
          <p className="text-sm text-sea/80">
            Stock reserved · confirmation sent (demo). Track progress below.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lagoon">Order</p>
          <h1 className="font-display text-4xl text-ink">{order.id}</h1>
          <p className="mt-1 text-sm text-ink/55">
            Placed {formatDate(order.createdAt)} · ETA {formatDate(order.estimatedDelivery)}
          </p>
        </div>
        <p className="font-display text-2xl">{formatINR(order.total)}</p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl">Tracking</h2>
          <p className="mt-1 text-sm text-ink/55">
            {order.courier} · {order.trackingId}
          </p>
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.id} className="track-step">
                <span className="track-dot" data-done={i <= stepIndex ? "true" : "false"} />
                <div>
                  <p className={i <= stepIndex ? "font-medium text-ink" : "text-ink/40"}>
                    {step.label}
                  </p>
                  {i === stepIndex && (
                    <p className="text-xs text-lagoon">Current status</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {order.status !== "delivered" && (
            <button
              type="button"
              className="btn-outline mt-6 text-xs"
              onClick={() => advanceOrderDemo(order.id)}
            >
              Advance status (demo)
            </button>
          )}
          {order.status === "delivered" && (
            <Link href="/returns" className="btn-outline mt-6 inline-flex text-xs">
              Request return / refund
            </Link>
          )}
        </section>

        <section className="space-y-6">
          <div className="rounded-sm bg-white/55 p-5">
            <h2 className="font-display text-xl">Items</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {order.items.map((line) => (
                <li key={line.productId} className="flex justify-between gap-3 border-b border-sea/10 pb-3">
                  <div>
                    <p className="font-medium">{line.name}</p>
                    <p className="text-xs text-ink/50">
                      Qty {line.qty} · {line.sellerName} ·{" "}
                      {line.fulfillment === "internal" ? "Platform stock" : "Seller ship"}
                    </p>
                  </div>
                  <span>{formatINR(line.price * line.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-ink/60">
                <span>Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink/60">
                <span>Discount</span>
                <span>−{formatINR(order.discount)}</span>
              </div>
              <div className="flex justify-between text-ink/60">
                <span>Delivery</span>
                <span>{order.deliveryFee === 0 ? "Free" : formatINR(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total · {payLabel[order.paymentMethod]}</span>
                <span>{formatINR(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-sm bg-white/55 p-5 text-sm">
            <h2 className="font-display text-xl">Ship to</h2>
            <p className="mt-2 text-ink/75">
              {order.address.name}
              <br />
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}
              <br />
              {order.address.city}, {order.address.state} {order.address.pincode}
              <br />
              {order.address.phone}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="section text-ink/50">Loading order…</div>}>
      <OrderInner />
    </Suspense>
  );
}
