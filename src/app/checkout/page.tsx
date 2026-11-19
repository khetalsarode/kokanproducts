"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { applyCoupon } from "@/data/coupons";
import { getProduct } from "@/data/products";
import { formatINR } from "@/lib/format";
import type { PaymentMethod } from "@/types";

const payments: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "upi", label: "UPI", hint: "GPay, PhonePe, Paytm" },
  { id: "card", label: "Card", hint: "Visa, Mastercard, RuPay" },
  { id: "wallet", label: "Wallet", hint: "Amazon Pay, Paytm wallet" },
  { id: "cod", label: "Cash on delivery", hint: "Pay when the courier arrives" },
];

function CheckoutInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { cart, cartSubtotal, addresses, placeOrder, ready } = useShop();
  const couponFromUrl = search.get("coupon") ?? "";
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const [payment, setPayment] = useState<PaymentMethod>("upi");
  const [couponCode, setCouponCode] = useState(couponFromUrl);
  const [upiId, setUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const discount = useMemo(() => {
    if (!couponCode) return 0;
    const r = applyCoupon(couponCode, cartSubtotal);
    return r.ok ? r.discount : 0;
  }, [couponCode, cartSubtotal]);

  const delivery = cartSubtotal - discount >= 999 || cartSubtotal === 0 ? 0 : 49;
  const total = Math.max(0, cartSubtotal - discount + delivery);

  if (!ready) return <div className="section text-ink/50">Loading checkout…</div>;

  if (cart.length === 0) {
    return (
      <div className="section text-center">
        <h1 className="font-display text-3xl">Nothing to checkout</h1>
        <Link href="/products" className="btn-primary mt-6 inline-flex">
          Shop products
        </Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!addressId) return;
    setSubmitting(true);
    const order = placeOrder({
      addressId,
      paymentMethod: payment,
      couponCode: discount > 0 ? couponCode : undefined,
    });
    if (order) {
      router.push(`/orders/${order.id}?confirmed=1`);
    } else {
      setSubmitting(false);
    }
  }

  return (
    <div className="section !pt-8">
      <h1 className="font-display text-4xl text-ink">Checkout</h1>
      <p className="mt-2 text-sm text-ink/55">
        Mock payment UI — structured for Razorpay-class gateway later. No live charges.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-xl">Delivery address</h2>
            <div className="mt-4 space-y-3">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`block cursor-pointer rounded-sm border p-4 transition ${
                    addressId === a.id ? "border-sea bg-white/70" : "border-sea/15 bg-white/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    className="mr-2"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                  />
                  <span className="font-medium">{a.label}</span>
                  <p className="mt-1 pl-6 text-sm text-ink/70">
                    {a.name} · {a.phone}
                    <br />
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                    <br />
                    {a.city}, {a.state} {a.pincode}
                  </p>
                </label>
              ))}
            </div>
            <Link href="/account" className="mt-3 inline-block text-sm text-sea hover:underline">
              Manage addresses →
            </Link>
          </section>

          <section>
            <h2 className="font-display text-xl">Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {payments.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPayment(p.id)}
                  className={`rounded-sm border p-4 text-left transition ${
                    payment === p.id ? "border-sea bg-white/80" : "border-sea/15 bg-white/40"
                  }`}
                >
                  <p className="font-medium text-ink">{p.label}</p>
                  <p className="text-xs text-ink/50">{p.hint}</p>
                </button>
              ))}
            </div>

            {payment === "upi" && (
              <div className="mt-4">
                <label className="text-xs uppercase tracking-[0.15em] text-ink/50">UPI ID</label>
                <input
                  className="field mt-1 w-full"
                  placeholder="name@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            )}
            {payment === "card" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-ink/50">Name on card</label>
                  <input
                    className="field mt-1 w-full"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-ink/50">Card number</label>
                  <input className="field mt-1 w-full" placeholder="XXXX XXXX XXXX XXXX" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.15em] text-ink/50">Expiry</label>
                  <input className="field mt-1 w-full" placeholder="MM/YY" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.15em] text-ink/50">CVV</label>
                  <input className="field mt-1 w-full" placeholder="•••" />
                </div>
              </div>
            )}
            {payment === "wallet" && (
              <p className="mt-4 text-sm text-ink/60">
                You’ll confirm wallet payment on the provider screen (stubbed for demo).
              </p>
            )}
            {payment === "cod" && (
              <p className="mt-4 text-sm text-ink/60">
                Keep exact change ready. COD availability depends on pincode in production.
              </p>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-sm bg-white/55 p-5">
          <h2 className="font-display text-xl">Order</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.map((item) => {
              const p = getProduct(item.productId);
              if (!p) return null;
              return (
                <li key={item.productId} className="flex justify-between gap-2">
                  <span className="text-ink/70">
                    {p.shortName} × {item.qty}
                  </span>
                  <span>{formatINR(p.price * item.qty)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-2 border-t border-sea/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/60">Subtotal</span>
              <span>{formatINR(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Discount</span>
              <span>−{formatINR(discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Delivery</span>
              <span>{delivery === 0 ? "Free" : formatINR(delivery)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs uppercase tracking-[0.15em] text-ink/50">Coupon</label>
            <input
              className="field mt-1 w-full !py-2"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
            {submitting ? "Placing…" : `Place order · ${formatINR(total)}`}
          </button>
          <p className="mt-3 text-[11px] text-ink/40">
            By placing, you agree to sample-demo terms. No payment is captured.
          </p>
        </aside>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="section text-ink/50">Loading checkout…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
