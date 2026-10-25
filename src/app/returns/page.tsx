import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageMain } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Returns & refunds", description: "The Grind & Pour (demo store) returns policy." };

export default function ReturnsPage() {
  return (
    <PageMain>
      <PageHeader eyebrow="Help" title="Returns & refunds" intro="A demo policy for a demo store, written the way we'd want a real one to read." />
      <div className="prose-gp mt-8">
        <h2>Not loving it?</h2>
        <p>
          Coffee is personal. If a bag isn&apos;t for you, tell us within 14 days of delivery and we&apos;ll swap it for
          another roast or refund it, even if you&apos;ve opened it and brewed a few cups.
        </p>
        <h2>Unopened bags</h2>
        <p>Unopened bags can be returned within 14 days for a full refund. We cover return shipping if we sent the wrong item.</p>
        <h2>Damaged or wrong order</h2>
        <p>Send us a photo within 48 hours of delivery and we&apos;ll send a replacement straight away.</p>
        <h2>How refunds work</h2>
        <ol>
          <li>
            <Link href="/contact">Contact us</Link> with your order number (it starts with GP-).
          </li>
          <li>We confirm the swap or refund within one business day.</li>
          <li>Refunds go back to the original payment method within 5–7 business days.</li>
        </ol>
        <p>In this demo nothing is charged, so there is never anything to refund.</p>
      </div>
    </PageMain>
  );
}
