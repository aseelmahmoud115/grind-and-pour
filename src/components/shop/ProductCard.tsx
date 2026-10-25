"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { ROAST_LABELS, type Product } from "@/data/products";
import { formatCents, toCents } from "@/lib/money";
import { BrewReveal } from "./BrewReveal";
import { useAddToCart } from "./cart-hooks";

export function AccentDot({ color, className = "size-2.5" }: { color: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-block shrink-0 rounded-full ring-1 ring-espresso/15 ${className}`} style={{ backgroundColor: color }} />
  );
}

export function SoldOutBadge({ className = "" }: { className?: string }) {
  return <span className={`eyebrow rounded-full bg-espresso px-3 py-1.5 text-cream-light ${className}`}>Sold out</span>;
}

/**
 * Coffee card: the whole card links to the product page (stretched link on the
 * name); the round "+" sits above that link and adds the default size and grind.
 * The image is a Brew Reveal: bag → that coffee in a cup on hover, focus or touch.
 */
export function ProductCard({ product, sizes, priority = false }: { product: Product; sizes: string; priority?: boolean }) {
  const addToCart = useAddToCart();
  const soldOut = product.stock <= 0;
  const [card, setCard] = useState<HTMLElement | null>(null);

  return (
    <article ref={setCard} className="group relative flex h-full flex-col rounded-3xl bg-cream-light p-2.5 sm:p-3 shadow-[0_24px_48px_-24px_rgb(42_26_18/0.35)] transition-transform duration-300 ease-out hover:-translate-y-1">
      <BrewReveal product={product} card={card} sizes={sizes} priority={priority}>
        {/* Top right: the first tasting-note pill sits top left during the reveal. */}
        {soldOut && <SoldOutBadge className="absolute top-3 right-3 z-10" />}
      </BrewReveal>
      <div className="flex flex-1 flex-col px-1.5 pt-4 pb-1.5 sm:px-2">
        <p className="eyebrow inline-flex items-center gap-2 text-[11px] text-roast sm:text-[12px]">
          <AccentDot color={product.accent} className="size-2" />
          {ROAST_LABELS[product.roast]} roast
        </p>
        <h3 className="font-display mt-2 text-lg leading-tight font-semibold text-espresso sm:text-2xl">
          <Link
            href={`/product/${product.slug}`}
            className="after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-terracotta"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-roast">{product.short}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p>
            <span className="font-display block text-xl font-semibold text-espresso tabular-nums sm:text-2xl">
              {formatCents(toCents(product.price))}
            </span>
            <span className="text-xs text-roast">250 g</span>
          </p>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name}, 250 g, to cart`}
            className="relative z-10 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-espresso text-cream-light transition-colors duration-200 hover:bg-roast disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
