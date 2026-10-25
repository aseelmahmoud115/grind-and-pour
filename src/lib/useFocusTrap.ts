"use client";

import { useEffect, type RefObject } from "react";
import { useLenis } from "lenis/react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for a drawer or sheet while `active`: focus moves inside and
 * Tab cycles within it, Esc calls `onClose`, focus returns to whatever opened
 * it, and the page behind stops scrolling (Lenis, or the root overflow).
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
  const lenis = useLenis();

  useEffect(() => {
    const panel = ref.current;
    if (!active || !panel) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    (panel.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? panel).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    if (lenis) lenis.stop();
    else root.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      if (lenis) lenis.start();
      else root.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [active, ref, onClose, lenis]);
}
