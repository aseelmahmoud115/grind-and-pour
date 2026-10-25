"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PROMO_CODES } from "@/lib/money";

export const MAX_QTY = 10;

export type CartLine = {
  /** slug + size + grind: the same coffee in another size or grind is a separate line. */
  key: string;
  slug: string;
  variantId: string;
  grind: string;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  promo: string | null;
  /** Adds (or tops up) a line; `max` is the stock cap. Returns the quantity now in the cart. */
  add: (line: Omit<CartLine, "key">, max: number) => number;
  setQty: (key: string, qty: number, max: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Returns false for unknown codes. */
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
};

const keyOf = (l: Pick<CartLine, "slug" | "variantId" | "grind">) => `${l.slug}|${l.variantId}|${l.grind}`;
const clampQty = (qty: number, max: number) => Math.max(1, Math.min(qty, MAX_QTY, max));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      promo: null,
      add: (line, max) => {
        const key = keyOf(line);
        const existing = get().lines.find((l) => l.key === key);
        const qty = clampQty((existing?.qty ?? 0) + line.qty, max);
        set({
          lines: existing
            ? get().lines.map((l) => (l.key === key ? { ...l, qty } : l))
            : [...get().lines, { ...line, key, qty }],
        });
        return qty;
      },
      setQty: (key, qty, max) =>
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, qty: clampQty(qty, max) } : l)) }),
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      clear: () => set({ lines: [], promo: null }),
      applyPromo: (code) => {
        const normalised = code.trim().toUpperCase();
        if (!PROMO_CODES[normalised]) return false;
        set({ promo: normalised });
        return true;
      },
      removePromo: () => set({ promo: null }),
    }),
    {
      name: "gp-cart",
      storage: createJSONStorage(() => localStorage),
      // Rehydrated after mount (StoreHydration) so server and first client render match.
      skipHydration: true,
    },
  ),
);
