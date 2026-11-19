export type PayableMethod = "cod" | "online";

export type PaymentIntent = {
  provider: "cod" | "cashfree" | "none";
  method: PayableMethod;
  status: "pending" | "awaiting_gateway" | "paid" | "failed" | "not_required";
  /** Hosted checkout redirect (optional). */
  redirectUrl?: string;
  /** Cashfree JS checkout session. */
  paymentSessionId?: string;
  providerRef?: string;
  mode?: "sandbox" | "production";
};

export type CreatePaymentInput = {
  orderId: string;
  /** Amount in INR rupees (not paise). */
  amountInr: number;
  customer: { id?: string; name: string; email?: string; phone?: string };
  method: PayableMethod;
  returnUrl: string;
  notifyUrl?: string;
};

export interface PaymentProvider {
  id: "cod" | "cashfree";
  createPayment(input: CreatePaymentInput): Promise<PaymentIntent>;
}
