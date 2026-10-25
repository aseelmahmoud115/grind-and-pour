"use client";

import { Minus, Plus } from "lucide-react";

/** − qty + with 44 px targets. `max` is the stock/10 cap; buttons disable at the ends. */
export function QtyStepper({
  value,
  onChange,
  max,
  label,
  size = "md",
}: {
  value: number;
  onChange: (qty: number) => void;
  max: number;
  /** Accessible name, e.g. "Quantity of Sky Drift". */
  label: string;
  size?: "sm" | "md";
}) {
  const btn =
    "inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-espresso transition-colors hover:bg-espresso/10 disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center rounded-full border border-espresso/20 bg-cream-light ${size === "sm" ? "h-11" : "h-12"}`}
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="w-7 text-center font-medium tabular-nums text-espresso">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
