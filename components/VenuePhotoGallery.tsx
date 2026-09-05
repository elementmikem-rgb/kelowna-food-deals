"use client";

import { useState } from "react";
import type { VenuePhoto } from "@/lib/venues-data";

export function VenuePhotoGallery({
  photos,
  venueName,
}: {
  photos: VenuePhoto[];
  venueName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setOpenIndex(i)}
            className="press-pill aspect-square rounded-xl overflow-hidden border border-border bg-surface-raised"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${photo.photoMimeType};base64,${photo.photoData}`}
              alt={photo.caption ?? `${venueName} menu photo`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4"
          onClick={() => setOpenIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${open.photoMimeType};base64,${open.photoData}`}
            alt={open.caption ?? `${venueName} menu photo`}
            className="max-w-full max-h-full rounded-lg"
          />
          <button
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-background text-foreground flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
