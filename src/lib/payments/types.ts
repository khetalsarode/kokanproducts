export type PayableMethod = "cod" | "online";

export type PaymentIntent = {
  provider: "cod" | "cashfree" | "none";
  method: PayableMethod;
  status: "pending" | "awaiting_gateway" | "paid" | "failed" | "not_required";
  /** Present only when a real gateway session is created. */
  redirectUrl?: string;
  providerRef?: string;
};

export type CreatePaymentInput = {
  orderId: string;
  amountPaise: number;
  customer: { id?: string; name: string; email?: string; phone?: string };
  method: PayableMethod;
};

export interface PaymentProvider {
  id: "cod" | "cashfree";
  createPayment(input: CreatePaymentInput): Promise<PaymentIntent>;
}
