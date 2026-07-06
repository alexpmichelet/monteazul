"use client";

import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { PHOTO_PLACEHOLDER_GRADIENT } from "@/lib/commerce-media";

/**
 * Swipeable photo carousel of the Commerce detail screen, faithful to the
 * Claude Design prototype: full-width horizontally-scrolling, snap-aligned
 * slides with position dots that track the active photo. When a Commerce has no
 * photo yet, a single gradient placeholder slide is shown (and the dots are
 * omitted).
 */
export function PhotoCarousel({
  name,
  photos,
}: {
  name: string;
  photos: string[];
}) {
  const [active, setActive] = React.useState(0);
  const hasPhotos = photos.length > 0;
  // `null` marks the gradient placeholder slide used when there is no photo.
  const slides: (string | null)[] = hasPhotos ? photos : [null];

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive((prev) => (prev === index ? prev : index));
  }

  return (
    <div className="relative">
      <div
        onScroll={handleScroll}
        className="flex h-[300px] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
      >
        {slides.map((photo, index) => (
          <div
            key={photo ?? "placeholder"}
            data-testid="carousel-slide"
            data-placeholder={photo === null}
            className="relative flex h-[300px] w-full flex-none snap-center items-center justify-center overflow-hidden"
            style={
              photo === null
                ? { background: PHOTO_PLACEHOLDER_GRADIENT }
                : undefined
            }
          >
            {photo !== null ? (
              <Image
                src={photo}
                alt={`${name} — foto ${index + 1}`}
                fill
                sizes="480px"
                className="object-cover"
                priority={index === 0}
              />
            ) : null}
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5">
          {slides.map((photo, index) => (
            <span
              key={photo ?? index}
              data-testid="carousel-dot"
              data-active={index === active}
              className={cn(
                "h-1.5 rounded-pill transition-all",
                index === active ? "w-[18px] bg-white" : "w-1.5 bg-white/60",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
