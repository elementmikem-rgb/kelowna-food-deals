import { flushSync } from "react-dom";

interface ViewTransitionLike {
  ready?: Promise<unknown>;
  finished?: Promise<unknown>;
  updateCallbackDone?: Promise<unknown>;
}

// Runs a client state update inside a browser view transition (a short
// crossfade) when supported. Falls back to a plain update for browsers
// without the API and for visitors who prefer reduced motion.
export function withViewTransition(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => ViewTransitionLike | undefined;
  };
  if (
    !doc.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  const transition = doc.startViewTransition(() => {
    flushSync(update);
  });
  // Tapping a second chip while the first crossfade is still running makes the browser skip the first one
  // and reject its promises with "AbortError: Transition was skipped". The update itself still ran, so the
  // rejection is noise; left unhandled it shows up as an uncaught error on every quick double tap.
  for (const p of [transition?.ready, transition?.finished, transition?.updateCallbackDone]) p?.catch(() => {});
}
