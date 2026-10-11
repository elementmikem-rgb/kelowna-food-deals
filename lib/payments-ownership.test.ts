import { describe, it, expect } from "vitest";
import { confirmLocalOwnership, type OwnershipLookup } from "./payments-core";

function lookup(overrides: Partial<OwnershipLookup> = {}): OwnershipLookup {
  return {
    regionExists: async (slug) => slug === "kelowna",
    venueExists: async (id) => id === 42,
    bookingsById: async (ids) => ids.filter((i) => i === 7 || i === 8).map((id) => ({ id, venueId: 42, stripeSessionId: "cs_1" })),
    ...overrides,
  };
}

describe("confirmLocalOwnership (shared Stripe account: Photaro/Callova must never be recorded)", () => {
  it("accepts a tip for a region that exists", async () => {
    const r = await confirmLocalOwnership("cs_1", { kind: "tip", venueId: null, bookingIds: [], regionSlug: "kelowna" }, lookup());
    expect(r).toEqual({ ok: true, venueId: null });
  });

  it("rejects a tip for a region that does not exist here", async () => {
    const r = await confirmLocalOwnership("cs_1", { kind: "tip", venueId: null, bookingIds: [], regionSlug: "parasail-gold-coast" }, lookup());
    expect(r.ok).toBe(false);
  });

  it("accepts a credit bundle for a venue that exists", async () => {
    const r = await confirmLocalOwnership("cs_1", { kind: "credit_bundle", venueId: 42, bookingIds: [], regionSlug: null }, lookup());
    expect(r).toEqual({ ok: true, venueId: 42 });
  });

  it("rejects a credit bundle for an unknown venue", async () => {
    const r = await confirmLocalOwnership("cs_1", { kind: "credit_bundle", venueId: 999, bookingIds: [], regionSlug: null }, lookup());
    expect(r.ok).toBe(false);
  });

  it("accepts bookings that all exist locally and returns their venue", async () => {
    const r = await confirmLocalOwnership("cs_1", { kind: "booking", venueId: null, bookingIds: [7, 8], regionSlug: null }, lookup());
    expect(r).toEqual({ ok: true, venueId: 42 });
  });

  it("rejects when any booking id is missing locally (an id collision with another business)", async () => {
    const r = await confirmLocalOwnership("cs_1", { kind: "booking", venueId: null, bookingIds: [7, 500], regionSlug: null }, lookup());
    expect(r.ok).toBe(false);
  });

  it("rejects when the local booking belongs to a different Stripe session", async () => {
    const r = await confirmLocalOwnership(
      "cs_other",
      { kind: "booking", venueId: null, bookingIds: [7], regionSlug: null },
      lookup()
    );
    expect(r.ok).toBe(false);
  });

  it("accepts when the local booking has no session id stored yet", async () => {
    const r = await confirmLocalOwnership(
      "cs_1",
      { kind: "booking", venueId: null, bookingIds: [7], regionSlug: null },
      lookup({ bookingsById: async () => [{ id: 7, venueId: 42, stripeSessionId: null }] })
    );
    expect(r.ok).toBe(true);
  });
});
