"use client";

import { Children, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks";

type Props = {
  /** Accessible name of the scroll region. */
  label: string;
  /** Optional heading shown at the top left; the arrows sit at its right. */
  title?: ReactNode;
  children: ReactNode;
  /** Width (and any extra classes) of each slide, e.g. "w-[80%] md:w-[45%]", or one entry per slide. */
  itemClassName?: string | string[];
  /** Extra classes for the scroller, e.g. padding so card shadows aren't clipped. */
  trackClassName?: string;
  className?: string;
};

/**
 * Horizontal scroll-snap carousel with prev/next arrows (no dots).
 *
 * Scrolling: vertical wheel and vertical swipes always belong to the page (Lenis);
 * the carousel only claims horizontal intent (trackpad sideways, shift+wheel,
 * horizontal swipe). Keyboard: Left/Right on the focused region move one card.
 */
export function Carousel({
  label,
  title,
  children,
  itemClassName = "w-[80%] md:w-[45%]",
  trackClassName = "",
  className = "",
}: Props) {
  /** The scroller (focusable region); the slides live in the list inside it. */
  const track = useRef<HTMLDivElement>(null);
  /** Where an in-flight smooth scroll is heading, so rapid presses each advance one card. */
  const pending = useRef<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const [state, setState] = useState({ atStart: true, atEnd: false, scrollable: false });
  const items = Children.toArray(children);

  /** Distance between two slides (width + gap). */
  const step = useCallback(() => {
    const list = track.current?.firstElementChild;
    const [a, b] = list ? [list.children[0] as HTMLElement, list.children[1] as HTMLElement] : [];
    if (!a) return 0;
    return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
  }, []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setState({ atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= max - 2, scrollable: max > 2 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), measure()));
    };
    const onScrollEnd = () => (pending.current = null);
    // Horizontal intent stays here (native scroll); anything vertical bubbles on to Lenis and the page.
    const onWheel = (e: WheelEvent) => {
      const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontal && el.scrollWidth > el.clientWidth) e.stopPropagation();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    el.addEventListener("wheel", onWheel, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const s = step();
    // Exactly one card from wherever the last press was heading.
    const from = pending.current ?? el.scrollLeft;
    const target = Math.max(0, Math.min(max, (Math.round(from / s) + dir) * s));
    pending.current = target;
    el.scrollTo({ left: target, behavior: reduced ? "auto" : "smooth" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // let focused buttons/links inside keep their keys
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const arrows = (placement: string) =>
    state.scrollable && (
      <div className={`flex shrink-0 items-center gap-3 ${placement}`}>
        <ArrowButton direction="prev" disabled={state.atStart} onClick={() => go(-1)} />
        <ArrowButton direction="next" disabled={state.atEnd} onClick={() => go(1)} />
      </div>
    );

  return (
    // min-w-0: as a grid or flex child, the default min-width:auto would let the slides blow the column out.
    <div className={`min-w-0 ${className}`} data-carousel>
      {(title || state.scrollable) && (
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="min-w-0">{title}</div>
          {arrows("hidden sm:flex")}
        </div>
      )}
      <div
        ref={track}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={`carousel-track touch-pan-x touch-pan-y snap-x snap-mandatory overflow-x-auto ${trackClassName}`}
      >
        <ul className="flex gap-4">
          {items.map((child, i) => (
            <li key={i} className={`shrink-0 snap-start ${Array.isArray(itemClassName) ? (itemClassName[i] ?? "") : itemClassName}`}>
              {child}
            </li>
          ))}
        </ul>
      </div>
      {arrows("mt-2 justify-center sm:hidden")}
    </div>
  );
}

function ArrowButton({ direction, disabled, onClick }: { direction: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous products" : "Next products"}
      aria-disabled={disabled}
      onClick={() => !disabled && onClick()}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-espresso text-espresso transition-colors duration-200 hover:bg-espresso hover:text-cream-light aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-espresso"
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
