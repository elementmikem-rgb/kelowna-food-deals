import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake database: each db.select() call takes the next queued result, and every
// db.update().set() call is recorded so the tests can see exactly what would be written.
const { selectQueue, updates, makeSelect, TABLES } = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const updates: { table: unknown; values: Record<string, unknown> }[] = [];

  function makeSelect() {
    const result = () => Promise.resolve(selectQueue.shift() ?? []);
    const chain: Record<string, unknown> = {};
    chain.from = () => chain;
    chain.where = () => chain;
    chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => result().then(res, rej);
    return chain;
  }

  const TABLES = {
    bookings: { __t: "bookings", id: "id", status: "status" },
    venues: { __t: "venues", id: "id" },
    specials: { __t: "specials", id: "id", boostedUntil: "boostedUntil" },
    events: { __t: "events", id: "id", boostedUntil: "boostedUntil" },
    categorySponsors: { __t: "categorySponsors" },
    chatTermSponsors: { __t: "chatTermSponsors" },
  };
  return { selectQueue, updates, makeSelect, TABLES };
});

vi.mock("@/db", () => ({
  db: {
    select: () => makeSelect(),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => {
        updates.push({ table, values });
        return { where: () => Promise.resolve() };
      },
    }),
  },
  ...TABLES,
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  asc: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  sql: Object.assign(vi.fn(), {}),
}));
vi.mock("@/lib/admin-region", () => ({ regionScopeCondition: vi.fn() }));
vi.mock("@/lib/credits", () => ({ refundCredits: vi.fn(), centsToCredits: vi.fn() }));
vi.mock("@/lib/payments", () => ({ recordManualRefund: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));

import { activateBooking, approveBooking } from "./bookings-data";

const POSTER = "aGVsbG8="; // "hello" in base64, stands in for image bytes

function boostBooking(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    productType: "boost",
    venueId: 10,
    specialId: 55,
    eventId: null,
    startDate: "2020-01-01",
    endDate: "2099-12-31",
    status: "pending_approval",
    hasPhotoAddOn: true,
    photoData: POSTER,
    photoMimeType: "image/jpeg",
    ...over,
  };
}

beforeEach(() => {
  selectQueue.length = 0;
  updates.length = 0;
});

describe("activateBooking: a paid Boost with the poster add-on", () => {
  it("saves the poster on the special and starts the Boost", async () => {
    selectQueue.push([boostBooking()], [{ boostedUntil: null }]);
    await activateBooking(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe(TABLES.specials);
    expect(updates[0].values.photoData).toBe(POSTER);
    expect(updates[0].values.photoMimeType).toBe("image/jpeg");
    expect(updates[0].values.boostedUntil).toBeInstanceOf(Date);
    expect((updates[0].values.boostedUntil as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it("does the same for an event", async () => {
    selectQueue.push([boostBooking({ specialId: null, eventId: 77 })], [{ boostedUntil: null }]);
    await activateBooking(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe(TABLES.events);
    expect(updates[0].values.photoData).toBe(POSTER);
  });

  it("a plain Boost (no poster bought) does NOT overwrite or clear an existing poster", async () => {
    selectQueue.push(
      [boostBooking({ hasPhotoAddOn: false, photoData: null, photoMimeType: null })],
      [{ boostedUntil: null }]
    );
    await activateBooking(1);
    expect(updates).toHaveLength(1);
    expect("photoData" in updates[0].values).toBe(false);
    expect("photoMimeType" in updates[0].values).toBe(false);
    expect(updates[0].values.boostedUntil).toBeInstanceOf(Date);
  });

  it("running it again changes nothing once the Boost already covers the dates", async () => {
    const farFuture = new Date("2100-06-01T00:00:00Z");
    selectQueue.push([boostBooking()], [{ boostedUntil: farFuture }]);
    await activateBooking(1);
    expect(updates).toHaveLength(0);
  });

  it("does nothing for a booking that does not exist", async () => {
    selectQueue.push([]);
    await activateBooking(999);
    expect(updates).toHaveLength(0);
  });
});

describe("approveBooking: the admin step between payment and going live", () => {
  it("approving a booking whose dates include today approves it AND puts the poster live", async () => {
    selectQueue.push([boostBooking()], [boostBooking()], [{ boostedUntil: null }]);
    const out = await approveBooking(1);
    expect(out.venueId).toBe(10);
    expect(updates[0].table).toBe(TABLES.bookings);
    expect(updates[0].values.status).toBe("approved");
    expect(updates[1].table).toBe(TABLES.specials);
    expect(updates[1].values.photoData).toBe(POSTER);
  });

  it("approving a booking that starts in the future approves it but leaves the poster for the nightly sync", async () => {
    selectQueue.push([boostBooking({ startDate: "2098-01-01" })]);
    await approveBooking(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].values.status).toBe("approved");
  });

  it("ignores a booking that is not waiting for approval (no double approval)", async () => {
    selectQueue.push([boostBooking({ status: "approved" })]);
    const out = await approveBooking(1);
    expect(out.venueId).toBeNull();
    expect(updates).toHaveLength(0);
  });
});
