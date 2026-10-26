"use client";

import Link from "next/link";
import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { formatCents } from "@/lib/money";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useUi } from "@/store/ui";
import { useCartView } from "./cart-hooks";
import { CartLines, EmptyCart, FreeShippingBar } from "./CartParts";

const ease = [0.22, 1, 0.36, 1] as const;

/** Slides in from the right; modal while open (focus trap, Esc, scroll lock). Loaded by <CartDrawer>. */
export function CartDrawerPanel() {
  const open = useUi((s) => s.drawerOpen);
  const close = useUi((s) => s.closeDrawer);
  const { items, subtotal, count } = useCartView();
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open, close);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.button
            type="button"
            aria-label="Close cart"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 cursor-default bg-espresso/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-md flex-col bg-cream shadow-2xl outline-none"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-espresso/10 px-5">
              <h2 id="cart-title" className="font-display text-2xl font-semibold text-espresso">
                Your cart <span className="text-lg text-roast tabular-nums">({count})</span>
              </h2>
              <button
                type="button"
                onClick={close}
                data-autofocus
                aria-label="Close cart"
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-espresso transition-colors hover:bg-espresso/10"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            {items.length === 0 ? (
              <EmptyCart onNavigate={close} />
            ) : (
              <>
                <div className="shrink-0 border-b border-espresso/10 px-5 py-4">
                  <FreeShippingBar subtotal={subtotal} />
                </div>
                <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
                  <CartLines items={items} compact />
                </div>
                <div className="shrink-0 border-t border-espresso/10 bg-cream-light px-5 pt-4 pb-5">
                  <dl className="flex items-baseline justify-between text-lg font-semibold text-espresso">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatCents(subtotal)}</dd>
                  </dl>
                  <p className="mt-1 text-sm text-roast">Shipping and promo codes at checkout.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Link
                      href="/cart"
                      onClick={close}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-espresso text-[15px] font-medium text-espresso transition-colors hover:bg-espresso hover:text-cream-light"
                    >
                      View cart
                    </Link>
                    <Link
                      href="/checkout"
                      onClick={close}
                      className="inline-flex h-12 items-center justify-center rounded-full bg-espresso text-[15px] font-medium text-cream-light transition-colors hover:bg-roast"
                    >
                      Checkout
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
