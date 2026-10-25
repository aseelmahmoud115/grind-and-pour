import type { Metadata } from "next";
import { Suspense } from "react";
import { PageMain } from "@/components/PageHeader";
import { OrderSkeleton, OrderView } from "@/components/orders/OrderView";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

/**
 * Order ids are created in the browser, so they are only known at request time.
 * The params promise is handed to the client view inside Suspense (Cache Components).
 */
export default function OrderPage({ params }: PageProps<"/order/[id]">) {
  return (
    <PageMain>
      <Suspense fallback={<OrderSkeleton />}>
        <OrderView params={params} />
      </Suspense>
    </PageMain>
  );
}
