"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { FREE_SHIPPING_CENTS, formatCents } from "@/lib/money";
import { useCart } from "@/store/cart";
import { useUi } from "@/store/ui";
import type { CartItem } from "./cart-hooks";
import { QtyStepper } from "./QtyStepper";

/** Line items with image, name, size/grind, quantity stepper and remove. Shared by the drawer and /cart. */
export function CartLines({ items, compact = false }: { items: CartItem[]; compact?: boolean }) {
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const announce = useUi((s) => s.announce);
  const closeDrawer = useUi((s) => s.closeDrawer);

  return (
    <ul className="divide-y divide-espresso/10">
      {items.map((item) => (
        <li key={item.key} className="flex gap-4 py-5">
          <div className={`relative shrink-0 overflow-hidden rounded-xl bg-cream ${compact ? "h-24 w-[4.5rem]" : "h-32 w-24"}`}>
            <Image src={item.product.images[0]} alt="" fill sizes={compact ? "72px" : "96px"} className="object-cover" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/product/${item.slug}`}
                  onClick={closeDrawer}
                  className="font-display text-lg leading-tight font-semibold text-espresso hover:underline"
                >
                  {item.product.name}
                </Link>
                <p className="mt-1 text-sm text-roast">
                  {item.variantLabel} · {item.grind}
                </p>
              </div>
              <p className="shrink-0 font-medium text-espresso tabular-nums">{formatCents(item.lineCents)}</p>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 pt-3">
              <QtyStepper
                size="sm"
                value={item.qty}
                max={Math.min(10, item.max)}
                onChange={(q) => setQty(item.key, q, item.max)}
                label={`Quantity of ${item.product.name}, ${item.variantLabel}`}
              />
              <button
                type="button"
                onClick={() => {
                  remove(item.key);
                  announce(`Removed ${item.product.name} (${item.variantLabel}) from your cart.`);
                }}
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm text-roast transition-colors hover:bg-espresso/5 hover:text-espresso"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Remove<span className="sr-only"> {item.product.name}, {item.variantLabel}</span>
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "Free shipping over $40" progress. The bar animates with transform only, so nothing reflows. */
export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const left = FREE_SHIPPING_CENTS - subtotal;
  const ratio = Math.min(1, subtotal / FREE_SHIPPING_CENTS);
  return (
    <div>
      <p className="text-sm text-espresso">
        {left > 0 ? (
          <>
            You&apos;re <strong className="font-semibold">{formatCents(left)}</strong> away from free standard shipping.
          </>
        ) : (
          <>You&apos;ve unlocked free standard shipping.</>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-espresso/10"
      >
        <div className="h-full origin-left rounded-full bg-sage transition-transform duration-500 ease-out" style={{ transform: `scaleX(${ratio})` }} />
      </div>
    </div>
  );
}

export function SummaryRow({ label, value, strong = false }: { label: React.ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? "text-lg font-semibold text-espresso" : "text-[15px] text-espresso"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function EmptyCart({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <p className="font-display text-3xl font-semibold text-espresso">Your cart is empty</p>
      <p className="mt-3 max-w-xs text-[15px] text-roast">Pick a coffee and we&apos;ll roast it to order for you.</p>
      <Link
        href="/shop"
        onClick={onNavigate}
        className="mt-6 inline-flex h-12 items-center rounded-full bg-espresso px-7 text-[15px] font-medium text-cream-light transition-colors hover:bg-roast"
      >
        Shop coffee
      </Link>
    </div>
  );
}
