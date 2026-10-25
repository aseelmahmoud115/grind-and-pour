import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageMain } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Shipping & delivery", description: "How and when Grind & Pour (a demo store) ships coffee." };

export default function ShippingPage() {
  return (
    <PageMain>
      <PageHeader
        eyebrow="Help"
        title="Shipping & delivery"
        intro="Grind & Pour is a demo store: nothing actually ships. Here's how delivery would work if it did."
      />
      <div className="prose-gp mt-8">
        <h2>Roasted to order</h2>
        <p>
          We roast on Sundays, Tuesdays and Thursdays and ship within 2 business days of roasting, so your beans arrive
          at their best: rested for a few days, never stale.
        </p>
        <h2>Delivery options</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Method</th>
              <th scope="col">Time</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Standard</td>
              <td>3–5 business days</td>
              <td>$5, free on orders of $40 or more</td>
            </tr>
            <tr>
              <td>Express</td>
              <td>1–2 business days</td>
              <td>$12</td>
            </tr>
          </tbody>
        </table>
        <p>Business days are Sunday to Thursday. Orders placed after 14:00 Cairo time go out the next business day.</p>
        <h2>Where we deliver</h2>
        <p>Egypt, Palestine, Jordan, Saudi Arabia and the UAE. For anywhere else, choose &ldquo;Other&rdquo; at checkout.</p>
        <h2>Tracking</h2>
        <p>
          Your demo orders are saved on this device. See them any time in <Link href="/orders">Track my order</Link>.
        </p>
      </div>
    </PageMain>
  );
}
