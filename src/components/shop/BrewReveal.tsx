"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import type { Product } from "@/data/products";
import { DEFAULT_STEAM_AT, tastingNotes } from "@/lib/catalog";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks";
import { useActiveCard } from "./activeCard";
import { SteamCanvas } from "./SteamCanvas";
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
 * an accent glow, and living canvas steam rising from the liquid (it sits inside the
 * cup layer, so the wipe clips it). Reduced motion gets a plain 200 ms crossfade and
 * keeps only the photo's own steam.
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
          {!reduced && <AccentGlow accent={product.accent} surface={steam} on={on} />}
          <SteamCanvas active={on && !reduced} at={steam} rimWidth={product.rimWidth} />
        </motion.div>

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
