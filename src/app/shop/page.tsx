import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageMain } from "@/components/PageHeader";
import { ShopGrid, ShopView } from "@/components/shop/ShopView";

export const metadata: Metadata = {
  title: "Shop coffee",
  description: "Single origins, blends, Arabic & Turkish coffee and decaf, roasted to order. Demo store: no real payments are taken.",
};

export default function ShopPage() {
  return (
    <PageMain>
      <PageHeader
        eyebrow="Roasted to order"
        title="Shop coffee"
        intro="Every bag is roasted the week it ships. Filter by roast or style, then pick your size and grind on the next page."
      />
      {/* The filters live in the URL; until it's read, the full list renders as the static shell. */}
      <Suspense fallback={<ShopGrid />}>
        <ShopView />
      </Suspense>
    </PageMain>
  );
}
