"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { SteamCanvas } from "@/components/shop/SteamCanvas";
import { useCircleWipe } from "@/components/shop/useCircleWipe";
import { DEFAULT_STEAM_AT } from "@/lib/catalog";
import { usePrefersReducedMotion } from "@/lib/hooks";

/**
 * Main image (a swipeable scroll-snap strip with thumbnails when there are several
 * photos) plus a "Bag / In the cup" toggle that reveals the cup with the same
 * circle wipe as the product cards (a crossfade under reduced motion).
 */
export function Gallery({
  images,
  cupImage,
  name,
  steamAt = DEFAULT_STEAM_AT,
  rimWidth,
}: {
  images: string[];
  cupImage: string;
  name: string;
  steamAt?: { x: number; y: number };
  rimWidth?: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inCup, setInCup] = useState(false);
  const reduced = usePrefersReducedMotion();
  const wipe = useCircleWipe();
  const many = images.length > 1;

  useEffect(() => {
    const el = track.current;
    if (!el || !many) return;
    const onScroll = () => setActive(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [many]);

  useEffect(() => {
    if (reduced) return;
    if (inCup) wipe.open();
    else wipe.close();
  }, [inCup, reduced, wipe]);

  const show = (i: number) =>
    track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: reduced ? "auto" : "smooth" });

  const toggle = "inline-flex h-11 cursor-pointer items-center rounded-full px-5 text-[15px] font-medium transition-colors";

  return (
    <div>
      <div className="relative">
        <div
          ref={track}
          role={many ? "region" : undefined}
          aria-label={many ? `${name} photos` : undefined}
          tabIndex={many ? 0 : undefined}
          className="carousel-track flex snap-x snap-mandatory overflow-x-auto rounded-3xl bg-cream-light touch-pan-x touch-pan-y"
        >
          {images.map((src, i) => (
            <div key={src} className="relative aspect-[3/4] w-full shrink-0 snap-start">
              <Image
                src={src}
                alt={i === 0 ? `${name} coffee bag` : `${name}, photo ${i + 1} of ${images.length}`}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* "In the cup": the same circle wipe as the cards, from the centre. */}
        <motion.div
          className={`absolute inset-0 overflow-hidden rounded-3xl ${inCup ? "" : "pointer-events-none"}`}
          style={reduced ? undefined : { clipPath: wipe.clipPath }}
          initial={false}
          animate={reduced ? { opacity: inCup ? 1 : 0 } : undefined}
          transition={{ duration: 0.2 }}
          aria-hidden={!inCup}
        >
          <Image src={cupImage} alt={`${name}, brewed and served in a cup`} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover object-center" />
          <SteamCanvas active={inCup && !reduced} at={steamAt} rimWidth={rimWidth} />
        </motion.div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Photo" className="inline-flex rounded-full border border-espresso/25 bg-cream-light p-1">
          <button
            type="button"
            aria-pressed={!inCup}
            onClick={() => setInCup(false)}
            className={`${toggle} ${!inCup ? "bg-espresso text-cream-light" : "text-espresso hover:bg-espresso/10"}`}
          >
            Bag
          </button>
          <button
            type="button"
            aria-pressed={inCup}
            onClick={() => setInCup(true)}
            className={`${toggle} ${inCup ? "bg-espresso text-cream-light" : "text-espresso hover:bg-espresso/10"}`}
          >
            In the cup
          </button>
        </div>

        {many && (
          <ul className="flex gap-3" aria-label="Choose a photo">
            {images.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => {
                    setInCup(false);
                    show(i);
                  }}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === active && !inCup ? "true" : undefined}
                  className={`relative block h-20 w-16 cursor-pointer overflow-hidden rounded-xl border-2 ${
                    i === active && !inCup ? "border-espresso" : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                >
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
