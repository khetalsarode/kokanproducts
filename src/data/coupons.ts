import type { Coupon } from "@/types";

export const coupons: Coupon[] = [
  {
    code: "KOKAN100",
    label: "₹100 off on orders above ₹799",
    type: "flat",
    value: 100,
    minOrder: 799,
  },
  {
    code: "FIRST50",
    label: "10% off first order (max ₹150)",
    type: "percent",
    value: 10,
    minOrder: 499,
  },
  {
    code: "MONSOON15",
    label: "15% off monsoon specials (min ₹999)",
    type: "percent",
    value: 15,
    minOrder: 999,
  },
];

export function applyCoupon(
  code: string,
  subtotal: number,
): { ok: true; coupon: Coupon; discount: number } | { ok: false; message: string } {
  const coupon = coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  if (!coupon) return { ok: false, message: "Coupon not found" };
  if (subtotal < coupon.minOrder) {
    return {
      ok: false,
      message: `Add ₹${coupon.minOrder - subtotal} more to use ${coupon.code}`,
    };
  }
  const raw =
    coupon.type === "flat"
      ? coupon.value
      : Math.round((subtotal * coupon.value) / 100);
  const discount = coupon.code === "FIRST50" ? Math.min(raw, 150) : raw;
  return { ok: true, coupon, discount: Math.min(discount, subtotal) };
}
