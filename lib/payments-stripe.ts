import type Stripe from "stripe";
import type { ChargeFacts } from "./payments-core";

// Looks up the Stripe fee and real payment time for a payment. Takes a narrow client so
// it can be tested without the Stripe SDK. A failure here must never block recording the
// payment itself: every path returns null and the caller stores the row with a null fee
// (and a note), which getIncomeForDay reports as "salesMissingFee".

interface BalanceTransactionLike {
  fee: number;
}
interface ChargeLike {
  id: string;
  created: number;
  balance_transaction: BalanceTransactionLike | string | null;
}
interface PaymentIntentLike {
  id: string;
  latest_charge: ChargeLike | string | null;
}

export interface FeeLookupClient {
  retrievePaymentIntent(id: string): Promise<PaymentIntentLike>;
  listInvoicePayments(invoiceId: string): Promise<{ payment: { payment_intent?: string | { id: string } | null } }[]>;
}

export async function fetchChargeFacts(client: FeeLookupClient, paymentIntentId: string | null): Promise<ChargeFacts | null> {
  if (!paymentIntentId) return null;
  try {
    const pi = await client.retrievePaymentIntent(paymentIntentId);
    const charge = pi.latest_charge;
    if (!charge || typeof charge === "string") return null;
    const bt = charge.balance_transaction;
    return {
      feeCents: bt && typeof bt === "object" ? bt.fee : null,
      chargeId: charge.id,
      paymentIntentId,
      paidAt: new Date(charge.created * 1000),
    };
  } catch (err) {
    console.error("payments: could not fetch charge/fee for", paymentIntentId, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function fetchInvoiceChargeFacts(client: FeeLookupClient, invoiceId: string): Promise<ChargeFacts | null> {
  try {
    const payments = await client.listInvoicePayments(invoiceId);
    const pi = payments[0]?.payment.payment_intent;
    const piId = typeof pi === "string" ? pi : (pi?.id ?? null);
    return await fetchChargeFacts(client, piId);
  } catch (err) {
    console.error("payments: could not fetch invoice payment for", invoiceId, err instanceof Error ? err.message : err);
    return null;
  }
}

// Adapts the real Stripe SDK to FeeLookupClient. Kept thin: all the logic is above.
export function stripeFeeClient(stripe: Stripe): FeeLookupClient {
  return {
    retrievePaymentIntent: (id) =>
      stripe.paymentIntents.retrieve(id, { expand: ["latest_charge.balance_transaction"] }) as unknown as Promise<PaymentIntentLike>,
    listInvoicePayments: async (invoiceId) => {
      const res = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 5 });
      return res.data as unknown as { payment: { payment_intent?: string | { id: string } | null } }[];
    },
  };
}
