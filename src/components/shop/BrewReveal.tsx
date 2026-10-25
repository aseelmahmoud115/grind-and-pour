"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import type { Product } from "@/data/products";
import { DEFAULT_STEAM_AT, tastingNotes } from "@/lib/catalog";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks";
import { useActiveCard } from "./activeCard";
import { EASE_OUT, useCircleWipe, type Point } from "./useCircleWipe";

const TILT_DEG = 6;
const TILT_SPRING = { stiffness: 200, damping: 20 };
/** Where the tasting-note pills sit around the image. */
const NOTE_SLOTS = ["left-[6%] top-[7%]", "right-[6%] top-[24%]", "left-[7%] bottom-[24%]", "right-[8%] bottom-[9%]"];
const CENTRE: Point = { x: 50, y: 50 };

/**
 * "Brew Reveal": hovering the image (pointer), focusing the card link (keyboard),
 * or the card becoming the active one (touch) turns the bag into that coffee in a
 * cup, with a circle wipe from the entry point, a 3D tilt, steam, tasting notes and
 * an accent glow. Reduced motion gets a plain 200 ms crossfade.
 *
 * Pointer events are read on the whole card (`card`), because the card's
 * stretched link covers the image; hits are tested against the image box.
 */
export function BrewReveal({
  product,
  card,
  sizes,
  priority = false,
  children,
}: {
  product: Product;
  /** The card element (set via a callback ref), whose pointer/focus events drive the reveal. */
  card: HTMLElement | null;
  sizes: string;
  priority?: boolean;
  /** Overlays such as the sold-out badge. */
  children?: ReactNode;
}) {
  const id = useId();
  const reduced = usePrefersReducedMotion();
  const touch = useMediaQuery("(hover: none)");
  const box = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchActive = useActiveCard(id, card, touch);
  const on = hovering || focused || touchActive;

  const wipe = useCircleWipe();
  const origin = useRef<Point>(CENTRE);
  const exit = useRef<Point>(CENTRE);
  const rotateX = useSpring(0, TILT_SPRING);
  const rotateY = useSpring(0, TILT_SPRING);
  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(50);
  const sheen = useMotionTemplate`radial-gradient(circle at ${sheenX}% ${sheenY}%, rgb(255 255 255 / 0.08), transparent 55%)`;

  const notes = tastingNotes(product);
  const steam = product.steamAt ?? DEFAULT_STEAM_AT;

  // Run the wipe whenever the revealed state changes (from the entry point, toward the exit point).
  useEffect(() => {
    if (reduced) return;
    if (on) wipe.open(origin.current);
    else wipe.close(exit.current);
  }, [on, reduced, wipe]);

  // Pointer (mouse/pen) and keyboard triggers, listened for on the whole card.
  useEffect(() => {
    if (!card) return;
    const toPoint = (e: PointerEvent, r: DOMRect): Point => ({
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    });
    let inside = false;
    const leave = (p: Point) => {
      inside = false;
      exit.current = p;
      rotateX.set(0);
      rotateY.set(0);
      setHovering(false);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !box.current) return;
      const r = box.current.getBoundingClientRect();
      const p = toPoint(e, r);
      const within = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (within && !inside) {
        inside = true;
        origin.current = p;
        setHovering(true);
      } else if (!within && inside) {
        leave(p);
        return;
      }
      if (!within || reduced) return;
      rotateY.set(((p.x - 50) / 50) * TILT_DEG);
      rotateX.set(((50 - p.y) / 50) * TILT_DEG);
      sheenX.set(p.x);
      sheenY.set(p.y);
    };
    const onLeave = (e: PointerEvent) => {
      if (!inside || !box.current) return;
      leave(toPoint(e, box.current.getBoundingClientRect()));
    };
    const onFocusIn = (e: FocusEvent) => {
      if ((e.target as HTMLElement).matches("a:focus-visible")) {
        origin.current = CENTRE;
        setFocused(true);
      }
    };
    const onFocusOut = () => {
      exit.current = CENTRE;
      setFocused(false);
    };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
    card.addEventListener("focusin", onFocusIn);
    card.addEventListener("focusout", onFocusOut);
    return () => {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
      card.removeEventListener("focusin", onFocusIn);
      card.removeEventListener("focusout", onFocusOut);
    };
  }, [card, reduced, rotateX, rotateY, sheenX, sheenY]);

  // Touch and keyboard reveals start from the centre.
  useEffect(() => {
    if (touchActive) origin.current = exit.current = CENTRE;
  }, [touchActive]);

  return (
    <div ref={box} className="relative aspect-[3/4]" style={{ perspective: 900 }}>
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-2xl bg-cream"
        style={reduced ? undefined : { rotateX, rotateY, willChange: hovering ? "transform" : undefined }}
      >
        {/* The bag gives way: 1 → 0.92, up 12 px, fades out. */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={reduced ? { opacity: 1 } : on ? { scale: 0.92, y: -12, opacity: 0 } : { scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: on ? 0.65 : 0.45, ease: EASE_OUT }}
        >
          <Image src={product.images[0]} alt={`${product.name} coffee bag`} fill sizes={sizes} priority={priority} className="object-cover" />
        </motion.div>

        {/* The cup: a circle wipe from the entry point (a plain crossfade under reduced motion). */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          style={reduced ? undefined : { clipPath: wipe.clipPath }}
          initial={false}
          animate={reduced ? { opacity: on ? 1 : 0 } : undefined}
          transition={{ duration: 0.2 }}
        >
          {/* Lazy-loaded as the card nears the viewport, so the reveal never shows an empty frame. */}
          <Image src={product.cupImage} alt="" fill sizes={sizes} className="object-cover object-center" />
          {!reduced && (
            <motion.div
              className="absolute inset-0"
              style={{ background: `radial-gradient(circle at ${steam.x}% ${steam.y + 18}%, ${product.accent}, transparent 62%)` }}
              initial={false}
              animate={{ opacity: on ? 0.14 : 0 }}
              transition={{ duration: on ? 0.8 : 0.45, ease: EASE_OUT }}
            />
          )}
        </motion.div>

        <AnimatePresence>{on && !reduced && <Steam at={steam} />}</AnimatePresence>

        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: sheen }}
            initial={false}
            animate={{ opacity: hovering ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>

      <TastingNotes notes={notes} on={on} reduced={reduced} />
      {children}
    </div>
  );
}

/** Three thin cream wisps rising over the rim, staggered by 180 ms, looping gently while revealed. */
function Steam({ at }: { at: Point }) {
  const paths = ["M20 58 C 12 46, 28 38, 20 26 S 14 10, 20 2", "M32 58 C 24 44, 40 36, 32 24 S 26 8, 32 2", "M44 58 C 36 46, 52 38, 44 26 S 38 10, 44 2"];
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 64 60"
      fill="none"
      className="pointer-events-none absolute w-[26%] -translate-x-1/2 -translate-y-full drop-shadow-[0_0_2px_rgb(42_26_18/0.35)]"
      style={{ left: `${at.x}%`, top: `${at.y}%` }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      {paths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="#F4EADB"
          strokeWidth={2.2}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0, y: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 0.9, 0], y: [0, -10, -20] }}
          transition={{
            duration: 2.4,
            times: [0, 0.5, 1],
            ease: "easeOut",
            delay: 0.55 + i * 0.18, // after the wipe
            repeat: Infinity,
            repeatDelay: 0.35,
          }}
        />
      ))}
    </motion.svg>
  );
}

/** Tasting notes as small cream pills, popping in 70 ms apart and floating ±3 px while revealed. */
function TastingNotes({ notes, on, reduced }: { notes: string[]; on: boolean; reduced: boolean }) {
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
