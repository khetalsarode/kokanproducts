"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useShop } from "@/context/ShopContext";
import { formatINR } from "@/lib/format";
import type { Order } from "@/types";

function ReturnInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { clearCart, setFlash } = useShop();
  const orderId = search.get("order_id") || "";
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "failed">("checking");
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("Confirming payment with Cashfree…");

  useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      setMessage("Missing order id.");
      return;
    }

    let tries = 0;
    let cancelled = false;

    async function poll() {
      tries += 1;
      try {
        const res = await fetch(
          `/api/checkout/verify?order_id=${encodeURIComponent(orderId)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          error?: string;
          paymentStatus?: string;
          order?: Order;
        };
        if (cancelled) return;
        if (!res.ok) {
          setStatus("failed");
          setMessage(data.error || "Could not verify payment.");
          return;
        }
        if (data.order) setOrder(data.order);
        if (data.paymentStatus === "paid") {
          setStatus("paid");
          setMessage("Payment successful.");
          clearCart();
          setFlash(`Order ${orderId} paid`);
          window.setTimeout(() => {
            router.replace(`/orders/${orderId}?confirmed=1`);
          }, 1200);
          return;
        }
        if (data.paymentStatus === "failed") {
          setStatus("failed");
          setMessage("Payment failed or expired. You can retry from checkout.");
          return;
        }
        setStatus("pending");
        setMessage("Payment is still processing…");
        if (tries < 8) {
          window.setTimeout(() => void poll(), 2000);
        }
      } catch {
        if (!cancelled) {
          setStatus("failed");
          setMessage("Network error while verifying payment.");
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, clearCart, setFlash, router]);

  return (
    <div className="section !pt-10 max-w-lg">
      <BrandLogo href="/" />
      <h1 className="mt-6 font-display text-3xl text-ink">Payment status</h1>
      <p className="mt-2 text-ink/65">{message}</p>
      {orderId && (
        <p className="mt-4 text-sm text-ink/50">
          Order ID: <span className="font-medium text-ink">{orderId}</span>
        </p>
      )}
      {order && (
        <p className="mt-2 text-sm text-ink/70">Total {formatINR(order.total)}</p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {status === "paid" && (
          <Link href={`/orders/${orderId}?confirmed=1`} className="btn-primary">
            View order
          </Link>
        )}
        {(status === "failed" || status === "pending") && (
          <>
            <Link href="/checkout" className="btn-primary">
              Back to checkout
            </Link>
            <Link href="/orders" className="btn-outline">
              My orders
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<div className="section text-ink/50">Checking payment…</div>}>
      <ReturnInner />
    </Suspense>
  );
}
