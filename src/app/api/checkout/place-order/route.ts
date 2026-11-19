import { NextResponse } from "next/server";
import { getRequestUser, newId } from "@/lib/auth";
import { getCatalogProduct } from "@/lib/catalog";
import { sql } from "@/lib/db";
import { isOnlinePaymentConfigured, startPayment } from "@/lib/payments";
import { ensureSeeded } from "@/lib/seed";
import type { Address, Order, OrderLine, PaymentMethod } from "@/types";

export const dynamic = "force-dynamic";

function makeOrderId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `KP-${rand}`;
}

function makeTrackingId(): string {
  return `DTDC${Math.floor(100000000 + Math.random() * 900000000)}`;
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser();
    const body = (await request.json()) as {
      items?: { productId: string; qty: number }[];
      address?: Address;
      paymentMethod?: PaymentMethod | "online";
      couponCode?: string;
      discount?: number;
    };

    const itemsIn = Array.isArray(body.items) ? body.items : [];
    if (itemsIn.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }
    if (!body.address?.name || !body.address.line1 || !body.address.city || !body.address.pincode) {
      return NextResponse.json({ error: "Delivery address is incomplete." }, { status: 400 });
    }

    const method = body.paymentMethod === "cod" ? "cod" : body.paymentMethod === "online" ? "online" : body.paymentMethod;
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

    const lines: OrderLine[] = [];
    let subtotal = 0;
    for (const item of itemsIn) {
      const qty = Math.max(1, Math.floor(Number(item.qty) || 0));
      const product = await getCatalogProduct(item.productId);
      if (!product || product.stock < qty) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product?.name || item.productId}.` },
          { status: 400 },
        );
      }
      lines.push({
        productId: product.id,
        name: product.name,
        qty,
        price: product.price,
        fulfillment: product.fulfillment,
        sellerName: product.sellerId,
      });
      subtotal += product.price * qty;
    }

    const discount = Math.max(0, Math.min(subtotal, Math.floor(Number(body.discount) || 0)));
    const deliveryFee = subtotal - discount >= 999 ? 0 : 49;
    const total = Math.max(0, subtotal - discount + deliveryFee);
    const orderId = makeOrderId();
    const trackingId = makeTrackingId();
    const eta = new Date();
    eta.setDate(eta.getDate() + 4);

    const payment = await startPayment(method === "cod" ? "cod" : "online", {
      orderId,
      amountPaise: total * 100,
      customer: {
        id: user?.id,
        name: body.address.name,
        email: user?.email,
        phone: body.address.phone,
      },
      method: method === "cod" ? "cod" : "online",
    });

    if (method === "online" && payment.status !== "awaiting_gateway") {
      // No fake paid status without gateway
    }
    if (method === "online" && !payment.redirectUrl) {
      return NextResponse.json(
        {
          error:
            "Cashfree is not fully configured. Order was not placed. Use COD for now.",
        },
        { status: 400 },
      );
    }

    const paymentStatus = method === "cod" ? "pending" : "awaiting_gateway";
    const address = { ...body.address, id: body.address.id || newId() };

    await sql(
      `insert into shop_orders (
        id, customer_id, status, payment_method, payment_status, payment_provider,
        subtotal, discount, delivery_fee, total, coupon_code, tracking_id, courier,
        estimated_delivery, address_json, items_json
      ) values (
        $1,$2,'placed',$3,$4,$5,$6,$7,$8,$9,$10,$11,'Delhivery',$12,$13::jsonb,$14::jsonb
      )`,
      [
        orderId,
        user?.id ?? null,
        method === "cod" ? "cod" : "online",
        paymentStatus,
        payment.provider,
        subtotal,
        discount,
        deliveryFee,
        total,
        body.couponCode || null,
        trackingId,
        eta.toISOString(),
        JSON.stringify(address),
        JSON.stringify(lines),
      ],
    );

    for (const line of lines) {
      await sql(
        `update catalog_products set stock = greatest(0, stock - $1), updated_at = now()
         where id = $2`,
        [line.qty, line.productId],
      );
    }

    const order: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      status: "placed",
      items: lines,
      address,
      paymentMethod: method === "cod" ? "cod" : "upi",
      subtotal,
      discount,
      deliveryFee,
      total,
      couponCode: body.couponCode,
      trackingId,
      courier: "Delhivery",
      estimatedDelivery: eta.toISOString(),
    };

    if (user) {
      await sql(
        `insert into customer_orders (id, customer_id, payload)
         values ($1, $2, $3::jsonb)
         on conflict (id) do update set payload = excluded.payload
         where customer_orders.customer_id = $2`,
        [orderId, user.id, JSON.stringify(order)],
      );
    }

    return NextResponse.json(
      {
        order,
        payment: {
          method,
          status: paymentStatus,
          provider: payment.provider,
          redirectUrl: payment.redirectUrl,
        },
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("place-order failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not place order." }, { status: 500 });
  }
}
