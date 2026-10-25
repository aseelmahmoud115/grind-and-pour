"use client";

import { useMemo } from "react";
import type { Product } from "@/data/products";
import { CATALOG, unitPriceCents } from "@/lib/catalog";
import { useCart, type CartLine } from "@/store/cart";
import { useStoresHydrated, useUi } from "@/store/ui";

export type CartItem = CartLine & {
  product: Product;
  variantLabel: string;
  unitCents: number;
  lineCents: number;
  /** Stock cap for the quantity stepper. */
  max: number;
};

/** Cart lines resolved against the catalog, with prices in cents. Empty until localStorage is read. */
export function useCartView() {
  const hydrated = useStoresHydrated();
  const lines = useCart((s) => s.lines);
  const promo = useCart((s) => s.promo);

  return useMemo(() => {
    const items: CartItem[] = [];
    for (const line of hydrated ? lines : []) {
      const product = CATALOG.find((p) => p.slug === line.slug);
      if (!product) continue; // no longer sold (or no photo): drop silently
      const unitCents = unitPriceCents(product, line.variantId);
      items.push({
        ...line,
        product,
        variantLabel: product.variants.find((v) => v.id === line.variantId)?.label ?? "",
        unitCents,
        lineCents: unitCents * line.qty,
        max: product.stock,
      });
    }
    const subtotal = items.reduce((sum, i) => sum + i.lineCents, 0);
    const count = items.reduce((n, i) => n + i.qty, 0);
    return { hydrated, items, subtotal, count, promo: hydrated ? promo : null };
  }, [hydrated, lines, promo]);
}

/** Adds to the cart, announces it politely and opens the drawer. */
export function useAddToCart() {
  const add = useCart((s) => s.add);
  const announce = useUi((s) => s.announce);
  const openDrawer = useUi((s) => s.openDrawer);

  return (product: Product, opts?: { variantId?: string; grind?: string; qty?: number; openDrawer?: boolean }) => {
    if (product.stock <= 0) return;
    const variant = product.variants.find((v) => v.id === opts?.variantId) ?? product.variants[0];
    const grind = opts?.grind ?? product.grindOptions[0];
    const qty = opts?.qty ?? 1;
    add({ slug: product.slug, variantId: variant.id, grind, qty }, product.stock);
    announce(`Added ${qty} × ${product.name} (${variant.label}, ${grind}) to your cart.`);
    if (opts?.openDrawer !== false) openDrawer();
  };
}
