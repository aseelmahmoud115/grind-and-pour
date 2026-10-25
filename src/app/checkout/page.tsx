import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { PageHeader, PageMain } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <PageMain>
      <PageHeader eyebrow="Demo store · no real payment is taken" title="Checkout" />
      <CheckoutView />
    </PageMain>
  );
}
