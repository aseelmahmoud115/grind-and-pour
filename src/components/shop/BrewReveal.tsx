"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import type { Product } from "@/data/products";
import { useMediaQuery, useNearViewport, usePrefersReducedMotion } from "@/lib/hooks";
import { useActiveCard } from "./activeCard";
import { EASE_OUT, useCircleWipe, type Point } from "./useCircleWipe";

// The revealed side (cup photo, glow, steam, tasting notes) loads once the card nears the viewport.
const CupArt = dynamic(() => import("./BrewRevealExtras").then((m) => m.CupArt), { ssr: false });
const TastingNotes = dynamic(() => import("./BrewRevealExtras").then((m) => m.TastingNotes), { ssr: false });

const TILT_DEG = 6;
const TILT_SPRING = { stiffness: 200, damping: 20 };
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
  const near = useNearViewport(box);

  const wipe = useCircleWipe();
  const origin = useRef<Point>(CENTRE);
  const exit = useRef<Point>(CENTRE);
  const rotateX = useSpring(0, TILT_SPRING);
  const rotateY = useSpring(0, TILT_SPRING);
  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(50);
  const sheen = useMotionTemplate`radial-gradient(circle at ${sheenX}% ${sheenY}%, rgb(255 255 255 / 0.08), transparent 55%)`;

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
          {/* Mounted as the card nears the viewport, so the reveal never shows an empty frame. */}
          {near && <CupArt product={product} sizes={sizes} on={on} reduced={reduced} />}
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

      {near && <TastingNotes product={product} on={on} reduced={reduced} />}
      {children}
    </div>
  );
}
