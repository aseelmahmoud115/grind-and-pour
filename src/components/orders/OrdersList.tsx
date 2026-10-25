"use client";

import Link from "next/link";
import { formatDateTime, formatDay } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { useOrders } from "@/store/orders";
import { useStoresHydrated } from "@/store/ui";

/** Past demo orders saved in this browser. */
export function OrdersList() {
  const hydrated = useStoresHydrated();
  const orders = useOrders((s) => s.orders);

  if (!hydrated) return <div className="mt-10 h-48 animate-pulse rounded-3xl bg-cream-light" aria-hidden="true" />;
  if (orders.length === 0) {
    return (
      <div className="mt-10 rounded-3xl bg-cream-light px-6 py-14 text-center">
        <p className="font-display text-3xl font-semibold text-espresso">No orders yet</p>
        <p className="mx-auto mt-3 max-w-sm text-[15px] text-roast">Orders you place in this demo store will appear here, on this device only.</p>
        <Link href="/shop" className="mt-6 inline-flex h-12 items-center rounded-full bg-espresso px-7 font-medium text-cream-light hover:bg-roast">
          Shop coffee
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-10 grid gap-4">
      {orders.map((o) => {
        const count = o.items.reduce((n, i) => n + i.qty, 0);
        return (
          <li key={o.id}>
            <Link
              href={`/order/${o.id}`}
              className="flex flex-col gap-3 rounded-3xl bg-cream-light p-5 transition-colors hover:bg-cream-light/70 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div>
                <p className="font-display text-2xl font-semibold text-espresso">{o.id}</p>
                <p className="text-[15px] text-roast">
                  Placed {formatDateTime(o.createdAt)} · {count} {count === 1 ? "item" : "items"} ·{" "}
                  {o.payment === "card" ? "Test card" : "Cash on delivery"}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-lg font-semibold text-espresso tabular-nums">{formatCents(o.total)}</p>
                <p className="text-sm text-roast">
                  Est. {formatDay(o.estimate.from)} – {formatDay(o.estimate.to)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
