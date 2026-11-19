import type { CreatePaymentInput, PaymentIntent, PaymentProvider } from "./types";

export const codProvider: PaymentProvider = {
  id: "cod",
  async createPayment(_input: CreatePaymentInput): Promise<PaymentIntent> {
    return {
      provider: "cod",
      method: "cod",
      status: "pending",
    };
  },
};
