"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

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

type NetworkInformation = { saveData?: boolean; effectiveType?: string };
const SLOW_NETWORKS = new Set(["slow-2g", "2g", "3g"]);
const noSubscribe = () => () => {};
let lowData: boolean | undefined;

function readLowData() {
  const c = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return !!c && (c.saveData === true || SLOW_NETWORKS.has(c.effectiveType ?? ""));
}

/**
 * Data saver on, or a 3G-or-slower connection (Network Information API; false where
 * it's unsupported). Read once per page load: effectiveType drifts with signal, and
 * flipping the film's mode mid-visit would change the page height under the reader.
 */
export function useLowData() {
  return useSyncExternalStore(
    noSubscribe,
    () => (lowData ??= readLowData()),
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

/** True once `ref` comes within `margin` of the viewport (and stays true). */
export function useNearViewport(ref: RefObject<Element | null>, margin = "300px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
