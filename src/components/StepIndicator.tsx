"use client";

import { useEffect, useState } from "react";
import { MOBILE_QUERY } from "@/lib/frames";

const STEPS = [
  { id: "grind", label: "Grind" },
  { id: "dial-in", label: "Dial in" },
  { id: "pour", label: "Pour" },
  { id: "sip", label: "Sip" },
];

const top = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;

/** Fixed 01–04 rail on the right edge; desktop only, hidden after the scenes. */
export function StepIndicator() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Never shown on phones: no work there on every scroll frame.
    if (window.matchMedia(MOBILE_QUERY).matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const marks = STEPS.map((s) => document.getElementById(s.id));
      const method = document.getElementById("method");
      if (marks.some((m) => !m) || !method) return;
      const probe = window.scrollY + window.innerHeight * 0.4;
      let current = 0;
      marks.forEach((m, i) => {
        if (top(m!) <= probe) current = i;
      });
      setActive(current);
      setVisible(method.getBoundingClientRect().bottom > window.innerHeight * 0.6);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav
      aria-label="Brewing steps"
      className={`fixed top-1/2 right-6 z-40 hidden -translate-y-1/2 transition-opacity duration-300 lg:block ${
        visible ? "opacity-100" : "pointer-events-none invisible opacity-0"
      }`}
    >
      <ol className="flex flex-col gap-1">
        {STEPS.map((s, i) => {
          const isActive = i === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "step" : undefined}
                className="group flex h-11 items-center justify-end gap-3"
              >
                <span
                  className={`eyebrow transition-opacity duration-200 ${
                    isActive ? "text-espresso opacity-100" : "text-roast opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")} {s.label}
                </span>
                <span
                  className={`block h-8 w-1.5 rounded-full transition-[transform,background-color] duration-300 ease-out ${
                    isActive ? "scale-y-100 bg-terracotta" : "scale-y-[0.19] bg-espresso/40 group-hover:bg-espresso"
                  }`}
                />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
