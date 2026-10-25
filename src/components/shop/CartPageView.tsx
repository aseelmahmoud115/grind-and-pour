"use client";

import Link from "next/link";
import { useCartView } from "./cart-hooks";
import { CartLines, EmptyCart, FreeShippingBar } from "./CartParts";
import { PromoForm, Totals } from "./Summary";

export function CartPageView() {
  const { hydrated, items, subtotal, promo } = useCartView();

  if (!hydrated) return <div className="mt-10 h-64 animate-pulse rounded-3xl bg-cream-light" aria-hidden="true" />;
  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-3xl bg-cream-light">
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
      <section aria-label="Items in your cart">
        <div className="rounded-2xl bg-cream-light px-5 py-4">
          <FreeShippingBar subtotal={subtotal} />
        </div>
        <CartLines items={items} />
      </section>

      <aside aria-labelledby="summary-title" className="h-fit rounded-3xl bg-cream-light p-6 lg:sticky lg:top-[calc(var(--nav-h)+2rem)]">
        <h2 id="summary-title" className="font-display text-2xl font-semibold text-espresso">
          Order summary
        </h2>
        <div className="mt-5">
          <PromoForm />
        </div>
        <div className="mt-6">
          <Totals subtotal={subtotal} promo={promo} delivery={null} />
        </div>
        <p className="mt-2 text-sm text-roast">Express delivery can be chosen at checkout.</p>
        <Link
          href="/checkout"
          className="mt-6 inline-flex h-13 w-full items-center justify-center rounded-full bg-espresso text-base font-medium text-cream-light transition-colors hover:bg-roast"
        >
          Checkout
        </Link>
        <Link href="/shop" className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-[15px] text-espresso underline underline-offset-4">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
