"use client";

import Link from "next/link";
import { useShop } from "@/context/ShopContext";
import { formatDate, formatINR } from "@/lib/format";

const statusLabel: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export default function OrdersPage() {
  const { orders, ready } = useShop();

  if (!ready) return <div className="section text-ink/50">Loading orders…</div>;

  return (
    <div className="section !pt-8">
      <h1 className="font-display text-4xl text-ink">Your orders</h1>
      <p className="mt-2 text-ink/60">Track deliveries and open order details.</p>

      {orders.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-ink/60">No orders yet.</p>
          <Link href="/products" className="btn-primary mt-4 inline-flex">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="block rounded-sm border border-sea/10 bg-white/50 p-4 transition hover:border-sea/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl text-ink">{o.id}</p>
                    <p className="text-sm text-ink/55">
                      {formatDate(o.createdAt)} · {o.items.length} item
                      {o.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatINR(o.total)}</p>
                    <p className="text-sm text-lagoon">{statusLabel[o.status]}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
