"use client";

import { useMemo, useRef } from "react";
import { animate, useMotionTemplate, useMotionValue, type AnimationPlaybackControls } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const OPEN_S = 0.65;
const CLOSE_S = 0.45;
/**
 * Fully open. circle() percentages are relative to √(w²+h²)/√2, so 150% covers the
 * box from any centre inside it; the box diagonal is ~141%.
 */
const FULL = 150;
const COVERS_ALL = 142;

export type Point = { x: number; y: number };
const CENTRE: Point = { x: 50, y: 50 };

/**
 * A clip-path circle wipe driven by motion values. open() grows it from a point,
 * close() collapses it toward a point. Both start from the current radius, so a
 * quick back-and-forth reverses smoothly instead of jumping.
 */
export function useCircleWipe() {
  const radius = useMotionValue(0);
  const x = useMotionValue(CENTRE.x);
  const y = useMotionValue(CENTRE.y);
  const clipPath = useMotionTemplate`circle(${radius}% at ${x}% ${y}%)`;
  const running = useRef<AnimationPlaybackControls | null>(null);

  // Stable across renders, so effects that call open/close only run when their state changes.
  return useMemo(() => {
    const to = (target: number, duration: number) => {
      running.current?.stop();
      running.current = animate(radius, target, { duration, ease: EASE_OUT });
    };
    return {
      clipPath,
      open(from: Point = CENTRE) {
        // Only re-aim while closed; moving the centre mid-wipe would jump.
        if (radius.get() < 1) {
          x.set(from.x);
          y.set(from.y);
        }
        to(FULL, OPEN_S);
      },
      close(toward: Point = CENTRE) {
        // Collapse toward the exit point, but only re-aim when the circle still covers everything.
        if (radius.get() >= COVERS_ALL) {
          x.set(toward.x);
          y.set(toward.y);
        }
        to(0, CLOSE_S);
      },
    };
  }, [clipPath, radius, x, y]);
}
