"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { Product } from "@/data/products";
import { DEFAULT_STEAM_AT, tastingNotes } from "@/lib/catalog";
import { LazySteam } from "./LazySteam";
import { EASE_OUT, type Point } from "./useCircleWipe";

/** Where the tasting-note pills sit around the image. */
const NOTE_SLOTS = ["left-[6%] top-[7%]", "right-[6%] top-[24%]", "left-[7%] bottom-[24%]", "right-[8%] bottom-[9%]"];

/** The revealed cup: photo, accent glow and living steam (inside the wipe layer, so the wipe clips them). */
export function CupArt({ product, sizes, on, reduced }: { product: Product; sizes: string; on: boolean; reduced: boolean }) {
  const steam = product.steamAt ?? DEFAULT_STEAM_AT;
  return (
    <>
      <Image src={product.cupImage} alt="" fill sizes={sizes} className="object-cover object-center" />
      {!reduced && <AccentGlow accent={product.accent} surface={steam} on={on} />}
      <LazySteam active={on && !reduced} at={steam} rimWidth={product.rimWidth} />
    </>
  );
}

/**
 * Accent glow: a soft ring of the coffee's label colour around the cup body, with a
 * clear centre so it reads as light behind the cup rather than a tint over it. The
 * accent is mixed toward cream so dark labels (navy, near-black) still glow.
 */
function AccentGlow({ accent, surface, on }: { accent: string; surface: Point; on: boolean }) {
  const tint = `color-mix(in oklab, ${accent} 60%, #f4eadb)`;
  return (
    <motion.div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(ellipse 46% 34% at ${surface.x}% ${surface.y + 8}%, transparent 50%, ${tint} 70%, transparent 100%)`,
      }}
      initial={false}
      animate={{ opacity: on ? 0.5 : 0 }}
      transition={{ duration: on ? 0.8 : 0.45, ease: EASE_OUT }}
    />
  );
}

/** Tasting notes as small cream pills, popping in 70 ms apart and floating ±3 px while revealed. */
export function TastingNotes({ product, on, reduced }: { product: Product; on: boolean; reduced: boolean }) {
  const notes = tastingNotes(product);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {notes.slice(0, NOTE_SLOTS.length).map((note, i) => (
        <motion.span
          key={note}
          className={`absolute ${NOTE_SLOTS[i]}`}
          initial={false}
          animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduced ? 1 : 0.8 }}
          transition={
            reduced
              ? { duration: 0.2 }
              : on
                ? { type: "spring", stiffness: 380, damping: 22, delay: 0.3 + i * 0.07 }
                : { duration: 0.2 }
          }
        >
          <motion.span
            className="block rounded-full bg-cream-light/95 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-espresso shadow-sm"
            animate={on && !reduced ? { y: [0, -3, 0, 3, 0] } : { y: 0 }}
            transition={on && !reduced ? { duration: 3.2 + i * 0.4, ease: "easeInOut", repeat: Infinity } : { duration: 0.2 }}
          >
            {note}
          </motion.span>
        </motion.span>
      ))}
    </div>
  );
}
