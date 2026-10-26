"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import type Lenis from "lenis";
import { usePrefersReducedMotion } from "@/lib/hooks";

// allowNestedScroll: wheel/touch over a nested scroller (carousel, drawer) that can move in that
// direction scrolls the nested element natively; otherwise Lenis scrolls the page.
// autoRaf off: <LenisControls> runs Lenis's frame loop only while a smooth scroll is in flight.
const LENIS_OPTIONS = { lerp: 0.09, smoothWheel: true, allowNestedScroll: true, autoRaf: false };
const ANCHOR_DURATION = 1.4;

/**
 * Root Lenis instance, absent entirely under reduced motion.
 *
 * In `root` mode ReactLenis renders no wrapper and registers a global instance,
 * so it is mounted beside the app instead of around it: toggling it when the
 * reduced-motion preference resolves after hydration then never remounts the page.
 */
export function SmoothScroll() {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return (
    <>
      <ReactLenis root options={LENIS_OPTIONS} />
      <LenisControls />
    </>
  );
}

/**
 * Drives Lenis on demand: a wheel gesture (Lenis's "virtual-scroll") or a
 * programmatic scrollTo starts a rAF loop that stops as soon as Lenis settles,
 * so an idle page runs no frame loop at all. Returns the wake-up call.
 */
function useLenisDriver(lenis: Lenis | undefined) {
  const wake = useRef(() => {});

  useEffect(() => {
    if (!lenis) return;
    let raf = 0;
    const tick = (now: number) => {
      lenis.raf(now);
      raf = lenis.isScrolling === "smooth" ? requestAnimationFrame(tick) : 0;
    };
    wake.current = () => {
      if (raf) return;
      lenis.time = 0; // the first step after idle advances by 0, not by the whole idle gap
      raf = requestAnimationFrame(tick);
    };
    const off = lenis.on("virtual-scroll", () => wake.current());
    return () => {
      off();
      cancelAnimationFrame(raf);
      wake.current = () => {};
    };
  }, [lenis]);

  return wake;
}

/**
 * Routes every same-page anchor (navbar, CTAs, step rail, footer; "#x", or "/#x"
 * while on the home page) through lenis.scrollTo. It listens in the capture phase
 * and only calls preventDefault, so a next/link still runs its own onClick (e.g.
 * closing the menu) but skips its instant jump.
 */
function LenisControls() {
  const lenis = useLenis();
  const wake = useLenisDriver(lenis);

  useEffect(() => {
    if (!lenis) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = (e.target as Element | null)?.closest?.("a[href]")?.getAttribute("href") ?? "";
      const match = /^\/?#(.+)$/.exec(href);
      if (!match || (href.startsWith("/") && window.location.pathname !== "/")) return;
      const id = match[1];
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      // Lenis already honours the target's scroll-margin-top (the navbar clearance on
      // #ratios and #beans), so no extra offset is needed here.
      lenis.scrollTo(target, { offset: 0, duration: ANCHOR_DURATION });
      wake.current();
      history.pushState(null, "", `#${id}`);
      // Keep keyboard focus with the content, as a native anchor jump would.
      if (target.getAttribute("aria-hidden") !== "true") {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [lenis, wake]);

  return null;
}
