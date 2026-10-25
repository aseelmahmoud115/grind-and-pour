"use client";

import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import { CheckCircle2 } from "lucide-react";
import { SummaryRow } from "@/components/shop/CartParts";
import { formatDay } from "@/lib/dates";
import { DELIVERY, formatCents } from "@/lib/money";
import { useOrders } from "@/store/orders";
import { useStoresHydrated } from "@/store/ui";

export function OrderSkeleton() {
  return <div className="h-96 animate-pulse rounded-3xl bg-cream-light" aria-hidden="true" />;
}

/** Confirmation for an order saved on this device (localStorage). */
export function OrderView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const hydrated = useStoresHydrated();
  const order = useOrders((s) => s.orders.find((o) => o.id === id));

  if (!hydrated) return <OrderSkeleton />;
  if (!order) {
    return (
      <div className="rounded-3xl bg-cream-light px-6 py-14 text-center">
        <h1 className="font-display text-4xl font-semibold text-espresso">Order not found</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-roast">
          Demo orders are only saved in the browser they were placed in, so we can&apos;t find {id} on this device.
        </p>
        <Link href="/orders" className="mt-6 inline-flex h-12 items-center rounded-full bg-espresso px-7 font-medium text-cream-light hover:bg-roast">
          See orders on this device
        </Link>
      </div>
    );
  }

  const firstName = order.contact.fullName.split(" ")[0];
  return (
    <div>
      <div className="flex flex-col gap-4">
        <CheckCircle2 className="size-10 text-sage" strokeWidth={1.75} aria-hidden="true" />
        <p className="eyebrow text-roast">Order {order.id}</p>
        <h1 className="font-display text-5xl leading-[0.95] font-black tracking-tight text-espresso [font-variation-settings:'SOFT'_100,'WONK'_1] sm:text-6xl">
          Thank you, {firstName}!
        </h1>
        <p className="max-w-2xl text-[17px] text-espresso">
          Your coffee is being roasted to order. This is a demo store, so no payment was taken and nothing will ship. A
          confirmation would normally go to <strong>{order.contact.email}</strong>.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <section aria-labelledby="items-title" className="rounded-3xl bg-cream-light p-6">
          <h2 id="items-title" className="font-display text-2xl font-semibold text-espresso">
            Items
          </h2>
          <ul className="mt-4 divide-y divide-espresso/10">
            {order.items.map((item) => (
              <li key={`${item.slug}-${item.variantLabel}-${item.grind}`} className="flex items-center gap-4 py-4">
                <div className="relative h-20 w-15 shrink-0 overflow-hidden rounded-lg bg-cream">
                  <Image src={item.image} alt="" fill sizes="60px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-espresso">{item.name}</p>
                  <p className="text-sm text-roast">
                    {item.variantLabel} · {item.grind} · Qty {item.qty}
                  </p>
                </div>
                <p className="text-espresso tabular-nums">{formatCents(item.unitCents * item.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-espresso/15 pt-4" aria-label="Order totals">
            <SummaryRow label="Subtotal" value={formatCents(order.subtotal)} />
            {order.discount > 0 && <SummaryRow label={`Discount (${order.promo})`} value={`−${formatCents(order.discount)}`} />}
            <SummaryRow
              label={`Shipping (${DELIVERY[order.delivery].label})`}
              value={order.shipping === 0 ? "Free" : formatCents(order.shipping)}
            />
            <div className="border-t border-espresso/15 pt-3">
              <SummaryRow label="Total" value={formatCents(order.total)} strong />
            </div>
          </dl>
        </section>

        <aside className="space-y-6 rounded-3xl bg-cream-light p-6 text-[15px] text-espresso">
          <div>
            <h2 className="eyebrow text-roast">Delivery estimate</h2>
            <p className="mt-2 font-display text-xl font-semibold">
              {formatDay(order.estimate.from)} – {formatDay(order.estimate.to)}
            </p>
            <p className="text-roast">
              {DELIVERY[order.delivery].label} · {DELIVERY[order.delivery].days}
            </p>
          </div>
          <div>
            <h2 className="eyebrow text-roast">Shipping to</h2>
            <address className="mt-2 not-italic">
              {order.contact.fullName}
              <br />
              {order.address.address}
              <br />
              {order.address.city}
              {order.address.postalCode ? ` ${order.address.postalCode}` : ""}, {order.address.country}
              <br />
              {order.contact.phone}
            </address>
          </div>
          <div>
            <h2 className="eyebrow text-roast">Payment</h2>
            <p className="mt-2">{order.payment === "card" ? "Demo test card (no charge)" : "Cash on delivery"}</p>
          </div>
        </aside>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/shop" className="inline-flex h-13 items-center justify-center rounded-full bg-espresso px-8 font-medium text-cream-light hover:bg-roast">
          Continue shopping
        </Link>
        <Link href="/orders" className="inline-flex h-13 items-center justify-center rounded-full border border-espresso px-8 font-medium text-espresso hover:bg-espresso hover:text-cream-light">
          View all orders
        </Link>
      </div>
    </div>
  );
}
