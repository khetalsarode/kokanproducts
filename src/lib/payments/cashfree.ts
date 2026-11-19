import type { CreatePaymentInput, PaymentIntent, PaymentProvider } from "./types";

/**
 * Cashfree placeholder — does NOT invent a successful payment.
 * Wire CASHFREE_APP_ID / CASHFREE_SECRET_KEY here later and return a real redirectUrl.
 */
export const cashfreeProvider: PaymentProvider = {
  id: "cashfree",
  async createPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
    const appId = process.env.CASHFREE_APP_ID?.trim() ?? "";
    const secret = process.env.CASHFREE_SECRET_KEY?.trim() ?? "";
    if (!appId || !secret) {
      return {
        provider: "cashfree",
        method: "online",
        status: "awaiting_gateway",
        // No fake success: caller must keep order unpaid until webhook confirms.
      };
    }
    // Future: call Cashfree Orders API with input.orderId / input.amountPaise
    void input;
    return {
      provider: "cashfree",
      method: "online",
      status: "awaiting_gateway",
    };
  },
};
