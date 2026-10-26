"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/** Hydration-safe media query (false on the server and during hydration). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Hydration-safe reduced-motion flag (false on the server and during hydration). */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/*
 * Navbar height, measured with a ResizeObserver in <Navbar>. Published as the
 * CSS variable --nav-h (for layout) and here (for JS-positioned UI like callouts).
 */
const DEFAULT_NAV_H = 72;
let navHeight = DEFAULT_NAV_H;
const navListeners = new Set<() => void>();

export function setNavHeight(px: number) {
  const h = Math.round(px);
  if (!h || h === navHeight) return;
  navHeight = h;
  document.documentElement.style.setProperty("--nav-h", `${h}px`);
  navListeners.forEach((l) => l());
}

export function useNavHeight() {
  return useSyncExternalStore(
    (cb) => {
      navListeners.add(cb);
      return () => {
        navListeners.delete(cb);
      };
    },
    () => navHeight,
    () => DEFAULT_NAV_H,
  );
}
