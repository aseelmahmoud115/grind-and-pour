import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/PageHeader";
import { OrdersList } from "@/components/orders/OrdersList";

export const metadata: Metadata = { title: "Your orders" };

export default function OrdersPage() {
  return (
    <PageMain>
      <PageHeader
        eyebrow="Track my order"
        title="Your orders"
        intro="Demo orders placed in this browser. Nothing here was charged or shipped."
      />
      <OrdersList />
    </PageMain>
  );
}
