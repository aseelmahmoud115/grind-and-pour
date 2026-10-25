"use client";

import { motion, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";

export type Range = [number, number];

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Builds keyframes for an optional enter range and an optional exit range.
 * With neither, the element simply stays at its resting value.
 */
function keyframes<T>(inAt: Range | undefined, outAt: Range | undefined, before: T, rest: T, after: T) {
  const input: number[] = [];
  const output: T[] = [];
  if (inAt) {
    input.push(inAt[0], inAt[1]);
    output.push(before, rest);
  }
  if (outAt) {
    input.push(outAt[0], outAt[1]);
    output.push(rest, after);
  }
  if (input.length === 0) {
    input.push(0, 1);
    output.push(rest, rest);
  }
  return { input, output };
}

type RevealProps = Omit<ComponentProps<typeof motion.div>, "style"> & {
  value: MotionValue<number>;
  inAt?: Range;
  outAt?: Range;
  reduced: boolean;
  /** Vertical travel in px (0 for a pure fade). */
  rise?: number;
};

/** Fade + rise tied to scroll. Under reduced motion it is a plain opacity change. */
export function Reveal({ value, inAt, outAt, reduced, rise = 24, ...rest }: RevealProps) {
  const fade = keyframes(inAt, outAt, 0, 1, 0);
  const move = keyframes(inAt, outAt, rise, 0, -rise);
  const opacity = useTransform(value, fade.input, fade.output, { ease: easeOut });
  const y = useTransform(value, move.input, move.output, { ease: easeOut });
  const ref = useRef<HTMLDivElement>(null);

  // Faded-out content stays rendered at opacity 0, so its compositor layer is
  // rasterized ahead of time (no paint spike when a scene's copy first appears);
  // `inert` keeps it out of the tab order and the accessibility tree meanwhile.
  const syncInert = (o: number) => {
    if (ref.current) ref.current.inert = o < 0.01;
  };
  useMotionValueEvent(opacity, "change", syncInert);
  useEffect(() => syncInert(opacity.get()));

  // will-change: these are written from JS every frame, so give them their own
  // compositor layer instead of repainting (full-screen scrims, big type) each tick.
  return (
    <motion.div
      ref={ref}
      {...rest}
      style={{ opacity, y: reduced || !rise ? 0 : y, willChange: "transform, opacity" }}
    />
  );
}

/**
 * One line of display type sliding through a mask: from below (105%) on enter,
 * out the top (−105%) on exit. Under reduced motion it only fades.
 */
export function MaskLine({
  value,
  inAt,
  outAt,
  reduced,
  className = "",
  children,
}: {
  value: MotionValue<number>;
  inAt?: Range;
  outAt?: Range;
  reduced: boolean;
  className?: string;
  children: ReactNode;
}) {
  const move = keyframes(inAt, outAt, "105%", "0%", "-105%");
  const fade = keyframes(inAt, outAt, 0, 1, 0);
  const y = useTransform(value, move.input, move.output, { ease: easeOut });
  const opacity = useTransform(value, fade.input, fade.output);
  return (
    // Masked vertically only (the word may overhang its column and drifts sideways). Padding gives
    // the heavy glyphs room inside the mask; the negative margin cancels it in layout.
    <span className={`-my-[0.08em] block overflow-x-visible overflow-y-clip py-[0.08em] ${className}`}>
      <motion.span className="block will-change-transform" style={reduced ? { opacity } : { y }}>
        {children}
      </motion.span>
    </span>
  );
}

/** Slow horizontal parallax (−3vw → +3vw) across a range. Off under reduced motion. */
export function Drift({
  value,
  range,
  reduced,
  children,
}: {
  value: MotionValue<number>;
  range: Range;
  reduced: boolean;
  children: ReactNode;
}) {
  const x = useTransform(value, range, ["-3vw", "3vw"]);
  return <motion.div className="will-change-transform" style={{ x: reduced ? 0 : x }}>{children}</motion.div>;
}
