"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A link column: an accordion on mobile, a plain always-open column from md up
 * (where the toggle is removed, so it never announces a stale "collapsed").
 */
export function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-cream/15 md:border-0">
      <h2 className="eyebrow mb-4 hidden text-cream md:block">{title}</h2>
      <h2 className="md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-full cursor-pointer items-center justify-between text-left"
        >
          <span className="eyebrow text-cream">{title}</span>
          <ChevronDown className={`size-5 text-cream/80 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </h2>
      <div id={id} className={`${open ? "block" : "hidden"} pb-5 md:block md:pb-0`}>
        {children}
      </div>
    </div>
  );
}
