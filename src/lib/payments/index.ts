import { cashfreeProvider, cashfreeMode, fetchCashfreeOrderStatus } from "./cashfree";
import { codProvider } from "./cod";
import type { CreatePaymentInput, PaymentIntent, PayableMethod } from "./types";

export type { PaymentIntent, PayableMethod, CreatePaymentInput };
export { fetchCashfreeOrderStatus, cashfreeMode };

export async function startPayment(
  method: PayableMethod,
  input: CreatePaymentInput,
): Promise<PaymentIntent> {
  if (method === "cod") {
    return codProvider.createPayment(input);
  }
  return cashfreeProvider.createPayment(input);
}

export function isOnlinePaymentConfigured(): boolean {
  return Boolean(
    process.env.CASHFREE_APP_ID?.trim() && process.env.CASHFREE_SECRET_KEY?.trim(),
  );
}
