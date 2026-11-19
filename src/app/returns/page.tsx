"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useShop } from "@/context/ShopContext";

export default function ReturnsPage() {
  const { orders, ready, setFlash } = useShop();
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("damaged");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!ready) return <div className="section text-ink/50">Loading…</div>;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orderId) return;
    setSubmitted(true);
    setFlash("Return request recorded (demo)");
  }

  return (
    <div className="section !pt-8 max-w-2xl">
      <h1 className="font-display text-4xl text-ink">Returns & refunds</h1>
      <p className="mt-2 text-ink/60">
        Entry point for post-delivery issues. Full refund workflow ships with admin tools later.
      </p>

      {submitted ? (
        <div className="mt-8 rounded-sm border border-lagoon/30 bg-mist/70 p-5">
          <p className="font-display text-xl text-sea">Request received</p>
          <p className="mt-2 text-sm text-sea/80">
            We’ll review order {orderId} and email next steps in production. For this demo, nothing
            else is required.
          </p>
          <Link href="/orders" className="btn-primary mt-4 inline-flex">
            Back to orders
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-ink/50">Order</label>
            <select
              className="field mt-1 w-full"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              required
            >
              <option value="">Select an order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} · {o.status}
                </option>
              ))}
            </select>
            {orders.length === 0 && (
              <p className="mt-2 text-sm text-ink/50">
                Place an order first, then return here.{" "}
                <Link href="/products" className="text-sea underline">
                  Shop
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-ink/50">Reason</label>
            <select
              className="field mt-1 w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="damaged">Damaged in transit</option>
              <option value="wrong">Wrong item</option>
              <option value="quality">Quality concern</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-ink/50">Notes</label>
            <textarea
              className="field mt-1 w-full min-h-24"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional details"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={orders.length === 0}>
            Submit request
          </button>
        </form>
      )}
    </div>
  );
}
