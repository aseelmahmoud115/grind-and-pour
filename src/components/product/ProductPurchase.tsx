"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Product } from "@/data/products";
import { useAddToCart } from "@/components/shop/cart-hooks";
import { QtyStepper } from "@/components/shop/QtyStepper";
import { unitPriceCents } from "@/lib/catalog";
import { useNavHeight } from "@/lib/hooks";
import { formatCents } from "@/lib/money";
import { MAX_QTY } from "@/store/cart";

/** Size pills, grind, quantity, Add to cart / Buy now, and the sticky mobile bar. */
export function ProductPurchase({ product }: { product: Product }) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [grind, setGrind] = useState(product.grindOptions[0]);
  const [qty, setQty] = useState(1);
  const [stickyVisible, setStickyVisible] = useState(false);
  const mainButton = useRef<HTMLButtonElement>(null);
  const navH = useNavHeight();
  const grindId = useId();

  const soldOut = product.stock <= 0;
  const max = Math.max(1, Math.min(MAX_QTY, product.stock));
  const unit = unitPriceCents(product, variantId);
  const variant = product.variants.find((v) => v.id === variantId)!;

  // Show the sticky bar once the main Add-to-cart button has scrolled up out of view.
  useEffect(() => {
    const el = mainButton.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      rootMargin: `-${navH}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [navH]);

  const add = () => addToCart(product, { variantId, grind, qty });
  const buyNow = () => {
    addToCart(product, { variantId, grind, qty, openDrawer: false });
    router.push("/checkout");
  };

  return (
    <div>
      <p className="font-display text-3xl font-semibold text-espresso tabular-nums" aria-live="polite">
        {formatCents(unit)}
        <span className="ml-2 text-base font-normal text-roast">/ {variant.label}</span>
      </p>

      <fieldset className="mt-7">
        <legend className="eyebrow mb-3 text-roast">Size</legend>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <label
              key={v.id}
              className="relative inline-flex h-11 cursor-pointer items-center rounded-full border border-espresso/25 bg-cream-light px-5 text-[15px] font-medium text-espresso transition-colors hover:border-espresso has-checked:border-espresso has-checked:bg-espresso has-checked:text-cream-light has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-terracotta"
            >
              <input
                type="radio"
                name="size"
                value={v.id}
                checked={variantId === v.id}
                onChange={() => setVariantId(v.id)}
                className="sr-only"
              />
              {v.label}
              {v.priceDelta > 0 && <span className="ml-1.5 text-sm opacity-80">+{formatCents(v.priceDelta * 100)}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        {product.grindOptions.length > 1 ? (
          <>
            <label htmlFor={grindId} className="eyebrow mb-3 block text-roast">
              Grind
            </label>
            <select
              id={grindId}
              value={grind}
              onChange={(e) => setGrind(e.target.value)}
              className="h-12 w-full max-w-xs cursor-pointer rounded-xl border border-espresso/20 bg-cream-light px-4 text-[16px] text-espresso"
            >
              {product.grindOptions.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </>
        ) : (
          <p className="text-[15px] text-espresso">
            <span className="eyebrow mr-2 text-roast">Grind</span>
            {product.grindOptions[0]} only
          </p>
        )}
      </div>

      <div className="mt-6">
        <p className="eyebrow mb-3 text-roast">Quantity</p>
        <QtyStepper value={qty} onChange={setQty} max={max} label={`Quantity of ${product.name}`} />
        {!soldOut && product.stock <= 6 && <p className="mt-2 text-sm text-roast">Only {product.stock} left in this roast batch.</p>}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          ref={mainButton}
          type="button"
          onClick={add}
          disabled={soldOut}
          className="inline-flex h-13 flex-1 cursor-pointer items-center justify-center rounded-full bg-espresso px-8 text-base font-medium text-cream-light transition-colors hover:bg-roast disabled:cursor-not-allowed disabled:opacity-40"
        >
          {soldOut ? "Sold out" : `Add to cart · ${formatCents(unit * qty)}`}
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={soldOut}
          className="inline-flex h-13 flex-1 cursor-pointer items-center justify-center rounded-full border border-espresso px-8 text-base font-medium text-espresso transition-colors hover:bg-espresso hover:text-cream-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          Buy now
        </button>
      </div>
      {soldOut && <p className="mt-3 text-[15px] text-roast">This roast is sold out for now. New batches usually land within two weeks.</p>}

      {/* Sticky add-to-cart (mobile). Slides with transform only; inert while hidden. */}
      <div
        inert={!stickyVisible}
        aria-hidden={!stickyVisible}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-espresso/10 bg-cream/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 ease-out md:hidden ${
          stickyVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-espresso">{product.name}</p>
            <p className="text-sm text-roast tabular-nums">
              {formatCents(unit)} · {variant.label}
            </p>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={soldOut}
            className="inline-flex h-12 shrink-0 cursor-pointer items-center rounded-full bg-espresso px-6 text-[15px] font-medium text-cream-light disabled:opacity-40"
          >
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
