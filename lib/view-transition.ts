import { flushSync } from "react-dom";

// Runs a client state update inside a browser view transition (a short
// crossfade) when supported. Falls back to a plain update for browsers
// without the API and for visitors who prefer reduced motion.
export function withViewTransition(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  };
  if (
    !doc.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  doc.startViewTransition(() => {
    flushSync(update);
  });
}
