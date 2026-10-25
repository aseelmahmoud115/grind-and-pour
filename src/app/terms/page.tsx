import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <PageMain>
      <PageHeader eyebrow="Legal" title="Terms" intro="The terms of a store that doesn't sell anything." />
      <div className="prose-gp mt-8">
        <h2>Demo only</h2>
        <p>
          Grind &amp; Pour is a portfolio demo. Placing an order does not create a purchase, take payment, or ship
          anything. Prices, stock levels and delivery dates are illustrative.
        </p>
        <h2>Content</h2>
        <p>
          Product photos and film frames were generated with AI. Coffee descriptions are written for the demo and don&apos;t
          describe real lots. There are no customer reviews on this site.
        </p>
        <h2>Contact</h2>
        <p>For questions about the project, see the GitHub link in the footer.</p>
      </div>
    </PageMain>
  );
}
