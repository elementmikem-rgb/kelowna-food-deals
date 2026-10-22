// A venue that has several live specials and then extracts to ZERO is far more likely to be a
// bad extraction (page truncated at the char cap, image transcription failed, JS-only page, a
// dropped evidence quote) than a venue that really deleted everything overnight. Archiving on
// that signal and recording the content hash locked 242 venues at zero (found 2026-10-22):
// the next night saw "unchanged, skipped" and never looked again.
//
// So an empty extraction against this many active cron-written specials is HELD: nothing is
// archived and the caller must not record the content hash, so tomorrow's run retries. A
// venue that genuinely has nothing now will re-extract (a few thousand tokens) each night
// until its page text changes, which is the cheaper failure.
export const MIN_ACTIVE_SPECIALS_TO_HOLD_EMPTY = 3;

export function shouldHoldEmptyExtraction(activeExistingCount: number, extractedCount: number): boolean {
  return extractedCount === 0 && activeExistingCount >= MIN_ACTIVE_SPECIALS_TO_HOLD_EMPTY;
}
