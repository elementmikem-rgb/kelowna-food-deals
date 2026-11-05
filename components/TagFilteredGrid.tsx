"use client";

import { Children, isValidElement, useMemo, useState } from "react";
import type { Language } from "@/lib/i18n";
import type { SpecialTag } from "@/lib/special-tags";
import { TagChipRow, usefulTags } from "./TagChipRow";

// A grid of server-rendered cards with a tag chip row above it. The page computes each card's tags and
// passes them by card key; this only decides which children stay visible, so the cards themselves
// (and their server-only parts) are untouched.
export function TagFilteredGrid({
  tagsByKey,
  lang = "en",
  className = "",
  children,
}: {
  tagsByKey: Record<string, SpecialTag[]>;
  lang?: Language;
  className?: string;
  children: React.ReactNode;
}) {
  const [tag, setTag] = useState<SpecialTag | "all">("all");
  const chips = useMemo(() => usefulTags(Object.values(tagsByKey)), [tagsByKey]);
  const kids = Children.toArray(children).filter(isValidElement);
  const shown = kids.filter((k) => tag === "all" || (tagsByKey[String(k.key).replace(/^\.\$/, "")] ?? []).includes(tag));
  return (
    <>
      <TagChipRow tags={chips} selected={tag} onSelect={setTag} lang={lang} />
      <div className={className}>{shown}</div>
    </>
  );
}
