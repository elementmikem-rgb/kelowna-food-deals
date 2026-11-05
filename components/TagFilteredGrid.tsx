"use client";

import { Children, isValidElement, useMemo, useState } from "react";
import type { Language } from "@/lib/i18n";
import type { SpecialTag } from "@/lib/special-tags";
import { TagChipRow, usefulTags } from "./TagChipRow";

// A grid of server-rendered cards with a tag chip row above it. The page computes each card's tags and
// passes them in the same order as the cards; this only decides which children stay visible, so the cards
// themselves (and their server-only parts) are untouched. Matching is by position, not by React key: keys
// do not survive the server-to-client boundary in a predictable form, and a mismatch there hid every card.
export function TagFilteredGrid({
  tagLists,
  lang = "en",
  className = "",
  children,
}: {
  tagLists: SpecialTag[][];
  lang?: Language;
  className?: string;
  children: React.ReactNode;
}) {
  const [tag, setTag] = useState<SpecialTag | "all">("all");
  const chips = useMemo(() => usefulTags(tagLists), [tagLists]);
  const kids = Children.toArray(children).filter(isValidElement);
  // If the two lists ever disagree in length, show everything rather than hide cards.
  const aligned = kids.length === tagLists.length;
  const shown = kids.filter((_, i) => tag === "all" || !aligned || tagLists[i].includes(tag));
  return (
    <>
      <TagChipRow tags={chips} selected={tag} onSelect={setTag} lang={lang} />
      <div className={className}>{shown}</div>
    </>
  );
}
