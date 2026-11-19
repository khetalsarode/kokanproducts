import type { CreatePaymentInput, PaymentIntent, PaymentProvider } from "./types";

const API_VERSION = "2025-01-01";

function credentials() {
  const appId = process.env.CASHFREE_APP_ID?.trim() ?? "";
  const secret = process.env.CASHFREE_SECRET_KEY?.trim() ?? "";
  const mode: "sandbox" | "production" =
    process.env.CASHFREE_ENV?.trim() === "production" ||
    (appId !== "" && !appId.toUpperCase().startsWith("TEST"))
      ? "production"
      : "sandbox";
  const base =
    mode === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";
  return { appId, secret, mode, base };
}

function normalizePhone(phone?: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return "9999999999";
}

export async function createCashfreeOrder(
  input: CreatePaymentInput,
): Promise<PaymentIntent> {
  const { appId, secret, mode, base } = credentials();
  if (!appId || !secret) {
    return {
      provider: "cashfree",
      method: "online",
      status: "awaiting_gateway",
      mode,
    };
  }

  const amount = Math.round(input.amountInr * 100) / 100;
  if (amount < 1) {
    throw new Error("Order amount must be at least ₹1 for Cashfree.");
  }

  const body = {
    order_id: input.orderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: (input.customer.id || "guest").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || "guest",
      customer_name: input.customer.name.slice(0, 100),
      customer_email: (input.customer.email || "orders@kokanproducts.com").slice(0, 100),
      customer_phone: normalizePhone(input.customer.phone),
    },
    order_meta: {
      return_url: input.returnUrl.includes("{order_id}")
        ? input.returnUrl
        : `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}order_id={order_id}`,
      ...(input.notifyUrl ? { notify_url: input.notifyUrl } : {}),
    },
    order_note: "KokanProducts order",
  };

  const res = await fetch(`${base}/orders`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": appId,
      "x-client-secret": secret,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    payment_session_id?: string;
    order_id?: string;
    message?: string;
    code?: string;
  };

  if (!res.ok || !data.payment_session_id) {
    const msg = data.message || data.code || `Cashfree error ${res.status}`;
    throw new Error(msg);
  }

  return {
    provider: "cashfree",
    method: "online",
    status: "awaiting_gateway",
    paymentSessionId: data.payment_session_id,
    providerRef: data.order_id || input.orderId,
    mode,
  };
}

export async function fetchCashfreeOrderStatus(orderId: string): Promise<{
  orderStatus: string;
  paymentStatus: string;
}> {
  const { appId, secret, base } = credentials();
  if (!appId || !secret) {
    return { orderStatus: "UNKNOWN", paymentStatus: "UNKNOWN" };
  }
  const res = await fetch(`${base}/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      accept: "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": appId,
      "x-client-secret": secret,
    },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    order_status?: string;
    order_id?: string;
  };
  const orderStatus = data.order_status || "UNKNOWN";
  // PAID / ACTIVE / EXPIRED / TERMINATED etc.
  const paymentStatus =
    orderStatus === "PAID"
      ? "paid"
      : orderStatus === "ACTIVE"
        ? "awaiting_gateway"
        : orderStatus === "EXPIRED" || orderStatus === "TERMINATED"
          ? "failed"
          : "pending";
  return { orderStatus, paymentStatus };
}

export const cashfreeProvider: PaymentProvider = {
  id: "cashfree",
  async createPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
    return createCashfreeOrder(input);
  },
};

export function cashfreeMode(): "sandbox" | "production" {
  return credentials().mode;
}
