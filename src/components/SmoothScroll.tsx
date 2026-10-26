"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { usePrefersReducedMotion } from "@/lib/hooks";

// allowNestedScroll: wheel/touch over a nested scroller (carousel, drawer) that can move in that
// direction scrolls the nested element natively; otherwise Lenis scrolls the page.
const LENIS_OPTIONS = { lerp: 0.09, smoothWheel: true, allowNestedScroll: true };
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
      <AnchorLinks />
    </>
  );
}

/**
 * Routes every same-page anchor (navbar, CTAs, step rail, footer; "#x", or "/#x"
 * while on the home page) through lenis.scrollTo. It listens in the capture phase
 * and only calls preventDefault, so a next/link still runs its own onClick (e.g.
 * closing the menu) but skips its instant jump.
 */
function AnchorLinks() {
  const lenis = useLenis();

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
      history.pushState(null, "", `#${id}`);
      // Keep keyboard focus with the content, as a native anchor jump would.
      if (target.getAttribute("aria-hidden") !== "true") {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [lenis]);

  return null;
}
