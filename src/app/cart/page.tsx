import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/PageHeader";
import { CartPageView } from "@/components/shop/CartPageView";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <PageMain>
      <PageHeader eyebrow="Demo store" title="Your cart" />
      <CartPageView />
    </PageMain>
  );
}
