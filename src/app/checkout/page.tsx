"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useShop } from "@/context/ShopContext";
import { useCatalog } from "@/context/CatalogContext";
import { applyCoupon } from "@/data/coupons";
import { formatINR } from "@/lib/format";
import type { Address, Order } from "@/types";

type CheckoutPay = "cod" | "online";

declare global {
  interface Window {
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => {
      checkout: (opts: {
        paymentSessionId: string;
        redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
      }) => Promise<unknown>;
    };
  }
}

function loadCashfreeSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Cashfree) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-cashfree-sdk="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Cashfree SDK failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.dataset.cashfreeSdk = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cashfree SDK failed to load"));
    document.head.appendChild(script);
  });
}

function CheckoutInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { customer } = useAuth();
  const { cart, cartSubtotal, addresses, clearCart, ready, setFlash, saveAddress } = useShop();
  const { getProduct } = useCatalog();
  const couponFromUrl = search.get("coupon") ?? "";
  const [addressId, setAddressId] = useState("");
  const [payment, setPayment] = useState<CheckoutPay>("cod");
  const [couponCode, setCouponCode] = useState(couponFromUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineReady, setOnlineReady] = useState(false);
  const [guestAddress, setGuestAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
  });

  useEffect(() => {
    if (!addressId && addresses[0]) {
      setAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, addressId]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/checkout/payment-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { onlineEnabled?: boolean }) => {
        if (!cancelled) setOnlineReady(Boolean(d.onlineEnabled));
      })
      .catch(() => {
        if (!cancelled) setOnlineReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customer || customer.role !== "customer") {
      setError("Sign in as a customer to place an order.");
      return;
    }
    if (payment === "online" && !onlineReady) {
      setError("Online payment is not connected yet. Please use Cash on Delivery.");
      return;
    }
    setSubmitting(true);

    let address: Address | undefined = addresses.find((a) => a.id === addressId);
    if (!address) {
      if (!guestAddress.name || !guestAddress.line1 || !guestAddress.city || !guestAddress.pincode) {
        setError("Add a complete delivery address.");
        setSubmitting(false);
        return;
      }
      address = {
        id: `addr-${Date.now()}`,
        label: "Delivery",
        ...guestAddress,
      };
      saveAddress(address);
    }

    try {
      const res = await fetch("/api/checkout/place-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
          address,
          paymentMethod: payment,
          couponCode: discount > 0 ? couponCode : undefined,
          returnOrigin: window.location.origin,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        order?: Order;
        payment?: {
          redirectUrl?: string;
          paymentSessionId?: string;
          mode?: "sandbox" | "production";
        };
      };
      if (!res.ok || !data.order) {
        setError(data.error || "Could not place order.");
        setSubmitting(false);
        return;
      }

      if (payment === "online") {
        const sessionId = data.payment?.paymentSessionId;
        if (!sessionId && data.payment?.redirectUrl) {
          window.location.href = data.payment.redirectUrl;
          return;
        }
        if (!sessionId) {
          setError("Cashfree session was not created. Try COD or contact support.");
          setSubmitting(false);
          return;
        }
        try {
          await loadCashfreeSdk();
          if (!window.Cashfree) {
            setError("Cashfree checkout failed to load.");
            setSubmitting(false);
            return;
          }
          const mode = data.payment?.mode === "production" ? "production" : "sandbox";
          const cashfree = window.Cashfree({ mode });
          await cashfree.checkout({
            paymentSessionId: sessionId,
            redirectTarget: "_self",
          });
          return;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not open Cashfree checkout.");
          setSubmitting(false);
          return;
        }
      }

      clearCart();
      setFlash(`Order ${data.order.id} placed`);
      router.push(`/orders/${data.order.id}?confirmed=1`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="section !pt-8">
      <h1 className="font-display text-4xl text-ink">Checkout</h1>
      <p className="mt-2 text-sm text-ink/55">
        Pay with Cash on Delivery, or complete online payment securely via Cashfree.
      </p>
      {(!customer || customer.role !== "customer") && (
        <p className="mt-4 rounded-sm border border-sea/15 bg-white/55 px-4 py-3 text-sm text-ink/70">
          Please{" "}
          <Link href="/customer/login?next=/checkout" className="font-medium text-sea hover:underline">
            sign in
          </Link>{" "}
          or{" "}
          <Link href="/customer/register" className="font-medium text-sea hover:underline">
            create a customer account
          </Link>{" "}
          to place an order (required to protect stock).
        </p>
      )}

      <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-xl">Delivery address</h2>
            {addresses.length > 0 ? (
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
                      <br />
                      {a.city}, {a.state} {a.pincode}
                    </p>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["name", "Full name"],
                    ["phone", "Phone"],
                    ["line1", "Address line"],
                    ["city", "City"],
                    ["pincode", "Pincode"],
                  ] as const
                ).map(([key, label]) => (
                  <input
                    key={key}
                    className={`field ${key === "line1" ? "sm:col-span-2" : ""}`}
                    placeholder={label}
                    value={guestAddress[key]}
                    onChange={(e) =>
                      setGuestAddress({ ...guestAddress, [key]: e.target.value })
                    }
                    required
                  />
                ))}
              </div>
            )}
            <Link href="/account" className="mt-3 inline-block text-sm text-sea hover:underline">
              Manage addresses →
            </Link>
          </section>

          <section>
            <h2 className="font-display text-xl">Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPayment("cod")}
                className={`rounded-sm border p-4 text-left transition ${
                  payment === "cod" ? "border-sea bg-white/80" : "border-sea/15 bg-white/40"
                }`}
              >
                <p className="font-medium text-ink">Cash on delivery</p>
                <p className="text-xs text-ink/50">Pay the courier when your order arrives</p>
              </button>
              <button
                type="button"
                onClick={() => onlineReady && setPayment("online")}
                disabled={!onlineReady}
                className={`rounded-sm border p-4 text-left transition ${
                  payment === "online" ? "border-sea bg-white/80" : "border-sea/15 bg-white/40"
                } ${!onlineReady ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <p className="font-medium text-ink">Online payment</p>
                <p className="text-xs text-ink/50">
                  {onlineReady
                    ? "UPI, cards & netbanking via Cashfree"
                    : "Cashfree keys not connected yet"}
                </p>
              </button>
            </div>
            {payment === "cod" && (
              <p className="mt-4 text-sm text-ink/60">
                Your order is saved as unpaid COD until delivery. Keep exact change ready.
              </p>
            )}
            {payment === "online" && onlineReady && (
              <p className="mt-4 text-sm text-ink/60">
                You will be redirected to Cashfree to complete payment. Your order is confirmed only
                after Cashfree reports success.
              </p>
            )}
            {!onlineReady && (
              <p className="mt-4 rounded-sm border border-sea/15 bg-white/40 px-3 py-2 text-sm text-ink/60">
                Online payment activates once Cashfree app ID and secret are bound to this app.
              </p>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-sm bg-white/55 p-5">
          <h2 className="font-display text-xl">Order summary</h2>
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
              <span>Total payable</span>
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
          {error && <p className="mt-3 text-sm text-spice">{error}</p>}
          <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
            {submitting
              ? payment === "online"
                ? "Opening Cashfree…"
                : "Placing…"
              : payment === "online"
                ? `Pay online · ${formatINR(total)}`
                : `Place order · ${formatINR(total)}`}
          </button>
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
