"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Touch devices have no hover, so one card at a time becomes "active" (and
 * reveals): the one most fully in view and closest to the centre of the screen
 * (in a carousel, the snapped card), chosen 350 ms after scrolling settles.
 */
const SETTLE_MS = 350;
const MIN_VISIBLE = 0.6;

const cards = new Map<string, HTMLElement>();
let active: string | null = null;
let timer = 0;
let listening = false;
const listeners = new Set<() => void>();

function pick() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let best: string | null = null;
  let bestScore = -Infinity;
  for (const [id, el] of cards) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue; // hidden at this breakpoint
    const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    const visible = (w * h) / (r.width * r.height);
    if (visible < MIN_VISIBLE) continue;
    const distance = Math.hypot(r.left + r.width / 2 - vw / 2, r.top + r.height / 2 - vh / 2);
    const score = visible * 1000 - distance;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  if (best !== active) {
    active = best;
    listeners.forEach((l) => l());
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(pick, SETTLE_MS);
}

function listen() {
  if (listening) return;
  listening = true;
  // Capture catches scrolling of any element (carousels) as well as the page.
  document.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule);
}

/** Registers a card while `enabled` (touch devices) and returns whether it is the active one. */
export function useActiveCard(id: string, el: HTMLElement | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !el) return;
    listen();
    cards.set(id, el);
    schedule();
    return () => {
      cards.delete(id);
      if (active === id) {
        active = null;
        listeners.forEach((l) => l());
      }
    };
  }, [id, el, enabled]);

  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => enabled && active === id,
    () => false,
  );
}
