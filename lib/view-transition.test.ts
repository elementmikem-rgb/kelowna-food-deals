import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("react-dom", () => ({ flushSync: (fn: () => void) => fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("withViewTransition", () => {
  it("swallows the rejection of a skipped transition", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const rejected = () => Promise.reject(new Error("Transition was skipped"));
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("document", {
      startViewTransition: (cb: () => void) => {
        cb();
        return { ready: rejected(), finished: rejected(), updateCallbackDone: Promise.resolve() };
      },
    });
    const { withViewTransition } = await import("./view-transition");
    const update = vi.fn();
    withViewTransition(update);
    await new Promise((r) => setTimeout(r, 20));
    process.off("unhandledRejection", unhandled);
    expect(update).toHaveBeenCalledOnce();
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("just runs the update when the browser has no view transitions", async () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("document", {});
    const { withViewTransition } = await import("./view-transition");
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledOnce();
  });
});
