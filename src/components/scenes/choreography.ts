"use client";

import { useFilm } from "@/components/Film";
import type { Range } from "@/components/ScrollMotion";
import { sceneAt } from "@/lib/timeline";

/** Display lines enter/exit one after another, this far apart (fraction of the scene). */
export const LINE_STAGGER = 0.02;
/** Eyebrow, body and buttons trail the display word by this much. */
export const SUPPORT_DELAY = 0.05;

/**
 * Converts ranges given as fractions of scene `i`'s own segment into global
 * film progress, so each overlay is choreographed against its own clip.
 */
export function useSceneRange(i: number) {
  const { tl } = useFilm();
  return (from: number, to: number, shift = 0): Range => [sceneAt(tl, i, from + shift), sceneAt(tl, i, to + shift)];
}
