import { NextResponse } from "next/server";
import { getRequestUser, newId } from "@/lib/auth";
import { applyCoupon } from "@/data/coupons";
import { sql } from "@/lib/db";
import { safeAppOrigin } from "@/lib/appOrigin";
import {
  cashfreeMode,
  isOnlinePaymentConfigured,
  startPayment,
} from "@/lib/payments";
import { rateLimit } from "@/lib/rateLimit";
import { ensureSeeded } from "@/lib/seed";
import { paymentHoldUntil, releaseAbandonedPaymentHolds } from "@/lib/stockHolds";
import type { Address, Fulfillment, Order, OrderLine, PaymentMethod } from "@/types";

export const dynamic = "force-dynamic";

function makeOrderId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `KP-${rand}`;
}

function makeTrackingId(): string {
  return `DTDC${Math.floor(100000000 + Math.random() * 900000000)}`;
}

type StockRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  fulfillment: string;
  seller_user_id: string | null;
  active: boolean;
};

async function restoreStock(lines: OrderLine[]) {
  for (const line of lines) {
    await sql(
      `update catalog_products set stock = stock + $1, updated_at = now() where id = $2`,
      [line.qty, line.productId],
    );
  }
}

export async function POST(request: Request) {
  const reserved: OrderLine[] = [];
  try {
    await ensureSeeded();
    await releaseAbandonedPaymentHolds();
    const user = await getRequestUser();
    if (!user || user.role !== "customer") {
      return NextResponse.json(
        { error: "Sign in as a customer to place an order." },
        { status: 401 },
      );
    }

    const limited = await rateLimit(`checkout:${user.id}`, 8, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many checkout attempts. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      items?: { productId: string; qty: number }[];
      address?: Address;
      paymentMethod?: PaymentMethod | "online" | "cod";
      couponCode?: string;
      returnOrigin?: string;
    };

    const itemsIn = Array.isArray(body.items) ? body.items : [];
    if (itemsIn.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }
    if (itemsIn.length > 50) {
      return NextResponse.json({ error: "Too many line items." }, { status: 400 });
    }
    if (!body.address?.name || !body.address.line1 || !body.address.city || !body.address.pincode) {
      return NextResponse.json({ error: "Delivery address is incomplete." }, { status: 400 });
    }

    const method =
      body.paymentMethod === "cod"
        ? "cod"
        : body.paymentMethod === "online"
          ? "online"
          : body.paymentMethod;
    if (method !== "cod" && method !== "online") {
      return NextResponse.json(
        { error: "Choose Cash on Delivery or Online payment." },
        { status: 400 },
      );
    }
    if (method === "online" && !isOnlinePaymentConfigured()) {
      return NextResponse.json(
        {
          error:
            "Online payment (Cashfree) is not connected yet. Please use Cash on Delivery.",
        },
        { status: 400 },
      );
    }

    let subtotal = 0;
    for (const item of itemsIn) {
      const qty = Math.max(1, Math.min(99, Math.floor(Number(item.qty) || 0)));
      if (!item.productId || qty < 1) {
        await restoreStock(reserved);
        return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
      }

      const updated = await sql<StockRow>(
        `update catalog_products
         set stock = stock - $1, updated_at = now()
         where id = $2 and active = true and stock >= $1
         returning id, name, price, stock, fulfillment, seller_user_id, active`,
        [qty, item.productId],
      );
      const product = updated[0];
      if (!product) {
        await restoreStock(reserved);
        return NextResponse.json(
          { error: `Insufficient stock for ${item.productId}.` },
          { status: 400 },
        );
      }

      const line: OrderLine = {
        productId: product.id,
        name: product.name,
        qty,
        price: Number(product.price),
        fulfillment: (product.fulfillment as Fulfillment) || "internal",
        sellerName: product.seller_user_id || "kp-internal",
      };
      reserved.push(line);
      subtotal += Number(product.price) * qty;
    }

    let discount = 0;
    let couponCode: string | undefined;
    if (body.couponCode?.trim()) {
      const result = applyCoupon(body.couponCode, subtotal);
      if (!result.ok) {
        await restoreStock(reserved);
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      discount = result.discount;
      couponCode = result.coupon.code;
    }

    const deliveryFee = subtotal - discount >= 999 ? 0 : 49;
    const total = Math.max(0, subtotal - discount + deliveryFee);
    const orderId = makeOrderId();
    const trackingId = makeTrackingId();
    const eta = new Date();
    eta.setDate(eta.getDate() + 4);

    const origin = safeAppOrigin(request, body.returnOrigin);
    const returnUrl = `${origin}/checkout/return?order_id={order_id}`;
    const notifyUrl = `${origin}/api/webhooks/cashfree`;

    let payment;
    try {
      payment = await startPayment(method === "cod" ? "cod" : "online", {
        orderId,
        amountInr: total,
        customer: {
          id: user.id,
          name: body.address.name,
          email: user.email,
          phone: body.address.phone,
        },
        method: method === "cod" ? "cod" : "online",
        returnUrl,
        notifyUrl,
      });
    } catch (err) {
      await restoreStock(reserved);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Payment gateway could not create the session.",
        },
        { status: 502 },
      );
    }

    if (method === "online" && !payment.paymentSessionId && !payment.redirectUrl) {
      await restoreStock(reserved);
      return NextResponse.json(
        {
          error:
            "Cashfree is not fully configured. Order was not placed. Use COD for now.",
        },
        { status: 400 },
      );
    }

    const paymentStatus = method === "cod" ? "pending" : "awaiting_gateway";
    const holdUntil = method === "online" ? paymentHoldUntil() : null;
    const address = { ...body.address, id: body.address.id || newId() };

    await sql(
      `insert into shop_orders (
        id, customer_id, status, payment_method, payment_status, payment_provider,
        subtotal, discount, delivery_fee, total, coupon_code, tracking_id, courier,
        estimated_delivery, address_json, items_json, payment_hold_until
      ) values (
        $1,$2,'placed',$3,$4,$5,$6,$7,$8,$9,$10,$11,'Delhivery',$12,$13::jsonb,$14::jsonb,$15
      )`,
      [
        orderId,
        user.id,
        method === "cod" ? "cod" : "online",
        paymentStatus,
        payment.provider,
        subtotal,
        discount,
        deliveryFee,
        total,
        couponCode || null,
        trackingId,
        eta.toISOString(),
        JSON.stringify(address),
        JSON.stringify(reserved),
        holdUntil ? holdUntil.toISOString() : null,
      ],
    );

    const order: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      status: "placed",
      items: reserved,
      address,
      paymentMethod: method === "cod" ? "cod" : "upi",
      subtotal,
      discount,
      deliveryFee,
      total,
      couponCode,
      trackingId,
      courier: "Delhivery",
      estimatedDelivery: eta.toISOString(),
    };

    await sql(
      `insert into customer_orders (id, customer_id, payload)
       values ($1, $2, $3::jsonb)
       on conflict (id) do update set payload = excluded.payload
       where customer_orders.customer_id = $2`,
      [orderId, user.id, JSON.stringify(order)],
    );

    return NextResponse.json(
      {
        order,
        payment: {
          method,
          status: paymentStatus,
          provider: payment.provider,
          redirectUrl: payment.redirectUrl,
          paymentSessionId: payment.paymentSessionId,
          mode: payment.mode || cashfreeMode(),
        },
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    if (reserved.length) await restoreStock(reserved);
    console.error("place-order failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not place order." }, { status: 500 });
  }
}
