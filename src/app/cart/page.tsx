"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductArt } from "@/components/ProductArt";
import { useShop } from "@/context/ShopContext";
import { applyCoupon, coupons } from "@/data/coupons";
import { getProduct } from "@/data/products";
import { formatINR } from "@/lib/format";

export default function CartPage() {
  const { cart, setQty, removeFromCart, cartSubtotal, ready } = useShop();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");

  const lines = useMemo(
    () =>
      cart
        .map((item) => {
          const product = getProduct(item.productId);
          if (!product) return null;
          return { item, product };
        })
        .filter(Boolean) as { item: (typeof cart)[0]; product: NonNullable<ReturnType<typeof getProduct>> }[],
    [cart],
  );

  const discount = applied?.discount ?? 0;
  const delivery = cartSubtotal - discount >= 999 || cartSubtotal === 0 ? 0 : 49;
  const total = Math.max(0, cartSubtotal - discount + delivery);

  function tryCoupon() {
    const result = applyCoupon(code, cartSubtotal);
    if (!result.ok) {
      setApplied(null);
      setCouponMsg(result.message);
      return;
    }
    setApplied({ code: result.coupon.code, discount: result.discount });
    setCouponMsg(`${result.coupon.label} applied`);
  }

  if (!ready) {
    return <div className="section text-ink/50">Loading bag…</div>;
  }

  return (
    <div className="section !pt-8">
      <h1 className="font-display text-4xl text-ink">Your bag</h1>
      <p className="mt-2 text-ink/60">
        {lines.length === 0
          ? "Empty for now — the coast is waiting."
          : `${lines.length} line${lines.length === 1 ? "" : "s"} · free delivery above ₹999`}
      </p>

      {lines.length === 0 ? (
        <div className="mt-10 text-center">
          <Link href="/products" className="btn-primary">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
          <ul className="space-y-5">
            {lines.map(({ item, product }) => (
              <li
                key={product.id}
                className="flex gap-4 border-b border-sea/10 pb-5"
              >
                <Link href={`/products/${product.slug}`} className="shrink-0">
                  <ProductArt product={product} size="sm" className="rounded-sm" />
                </Link>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link
                        href={`/products/${product.slug}`}
                        className="font-display text-lg text-ink hover:text-sea"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-ink/50">{product.weight}</p>
                    </div>
                    <p className="font-semibold">{formatINR(product.price * item.qty)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-full border border-sea/20 bg-white/70">
                      <button
                        type="button"
                        className="px-3 py-1 text-sea"
                        onClick={() => setQty(product.id, item.qty - 1)}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-sm">{item.qty}</span>
                      <button
                        type="button"
                        className="px-3 py-1 text-sea"
                        onClick={() => setQty(product.id, item.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-spice hover:underline"
                      onClick={() => removeFromCart(product.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-sm bg-white/55 p-5 shadow-[0_20px_50px_-40px_rgba(12,74,70,0.5)]">
            <h2 className="font-display text-xl text-ink">Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/60">Subtotal</span>
                <span>{formatINR(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/60">Discount</span>
                <span className="text-lagoon">−{formatINR(discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/60">Delivery</span>
                <span>{delivery === 0 ? "Free" : formatINR(delivery)}</span>
              </div>
              <div className="flex justify-between border-t border-sea/10 pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs uppercase tracking-[0.15em] text-ink/50">Coupon</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="field flex-1 !py-2"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="KOKAN100"
                />
                <button type="button" className="btn-outline !py-2 !px-3 text-xs" onClick={tryCoupon}>
                  Apply
                </button>
              </div>
              {couponMsg && <p className="mt-2 text-xs text-lagoon">{couponMsg}</p>}
              <p className="mt-2 text-[11px] text-ink/40">
                Try {coupons.map((c) => c.code).join(", ")}
              </p>
            </div>

            <Link
              href={`/checkout${applied ? `?coupon=${applied.code}` : ""}`}
              className="btn-primary mt-6 w-full"
            >
              Checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
