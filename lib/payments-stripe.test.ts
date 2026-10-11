import { describe, it, expect } from "vitest";
import { fetchChargeFacts, fetchInvoiceChargeFacts, type FeeLookupClient } from "./payments-stripe";

function client(overrides: Partial<FeeLookupClient> = {}): FeeLookupClient {
  return {
    retrievePaymentIntent: async () => ({
      id: "pi_1",
      latest_charge: { id: "ch_1", created: 1_790_000_000, balance_transaction: { fee: 62 } },
    }),
    listInvoicePayments: async () => [{ payment: { payment_intent: "pi_inv" } }],
    ...overrides,
  };
}

describe("fetchChargeFacts (fee comes from the charge's balance transaction)", () => {
  it("returns the fee, charge id and the charge's own time as paid_at", async () => {
    const facts = await fetchChargeFacts(client(), "pi_1");
    expect(facts).toEqual({
      feeCents: 62,
      chargeId: "ch_1",
      paymentIntentId: "pi_1",
      paidAt: new Date(1_790_000_000 * 1000),
    });
  });

  it("leaves the fee null when the balance transaction is not attached yet", async () => {
    const facts = await fetchChargeFacts(client({ retrievePaymentIntent: async () => ({ id: "pi_1", latest_charge: { id: "ch_1", created: 5, balance_transaction: null } }) }), "pi_1");
    expect(facts?.feeCents).toBeNull();
    expect(facts?.chargeId).toBe("ch_1");
  });

  it("leaves the fee null when the balance transaction was not expanded (a bare id string)", async () => {
    const facts = await fetchChargeFacts(client({ retrievePaymentIntent: async () => ({ id: "pi_1", latest_charge: { id: "ch_1", created: 5, balance_transaction: "txn_1" } }) }), "pi_1");
    expect(facts?.feeCents).toBeNull();
  });

  it("returns null when there is no charge yet", async () => {
    const facts = await fetchChargeFacts(client({ retrievePaymentIntent: async () => ({ id: "pi_1", latest_charge: null }) }), "pi_1");
    expect(facts).toBeNull();
  });

  it("returns null instead of throwing when Stripe errors, so the payment is still recorded", async () => {
    const facts = await fetchChargeFacts(
      client({
        retrievePaymentIntent: async () => {
          throw new Error("rate limited");
        },
      }),
      "pi_1"
    );
    expect(facts).toBeNull();
  });

  it("returns null for a missing payment intent id (no Stripe call)", async () => {
    let called = false;
    const facts = await fetchChargeFacts(
      client({
        retrievePaymentIntent: async () => {
          called = true;
          return { id: "x", latest_charge: null };
        },
      }),
      null
    );
    expect(facts).toBeNull();
    expect(called).toBe(false);
  });
});

describe("fetchInvoiceChargeFacts", () => {
  it("finds the invoice's payment intent, then its fee", async () => {
    const facts = await fetchInvoiceChargeFacts(
      client({ retrievePaymentIntent: async (id) => ({ id, latest_charge: { id: "ch_r", created: 7, balance_transaction: { fee: 105 } } }) }),
      "in_1"
    );
    expect(facts).toMatchObject({ feeCents: 105, chargeId: "ch_r", paymentIntentId: "pi_inv" });
  });

  it("returns null when the invoice has no payment intent", async () => {
    const facts = await fetchInvoiceChargeFacts(client({ listInvoicePayments: async () => [] }), "in_1");
    expect(facts).toBeNull();
  });

  it("returns null instead of throwing on a Stripe error", async () => {
    const facts = await fetchInvoiceChargeFacts(
      client({
        listInvoicePayments: async () => {
          throw new Error("boom");
        },
      }),
      "in_1"
    );
    expect(facts).toBeNull();
  });
});
