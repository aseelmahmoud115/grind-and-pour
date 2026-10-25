import type { Metadata } from "next";
import Link from "next/link";
import { AccordionItem } from "@/components/Accordion";
import { PageHeader, PageMain } from "@/components/PageHeader";

export const metadata: Metadata = { title: "FAQ", description: "Answers about grind, freshness, shipping and the Grind & Pour demo store." };

const link = "font-medium underline underline-offset-4";

const FAQ = [
  {
    q: "Is this a real shop?",
    a: (
      <>
        No. Grind &amp; Pour is a demo project. You can add coffee to your cart and check out, but no payment is taken
        and nothing ships. Use the test card 4242 4242 4242 4242 or cash on delivery to try the flow.
      </>
    ),
  },
  {
    q: "Which grind should I choose?",
    a: (
      <>
        Whole bean keeps longest, and grinding just before brewing tastes best. If you don&apos;t have a grinder, pick
        the grind for your brewer: Pour-over (medium-fine), French press (coarse), Espresso (fine) or Turkish (powder-fine).
      </>
    ),
  },
  {
    q: "How fresh is the coffee?",
    a: "Every order is roasted to order and ships within 2 business days of roasting. Most coffees taste best 5 to 30 days after the roast date printed on the bag.",
  },
  {
    q: "What's the difference between Arabic and Turkish coffee?",
    a: "Arabic coffee (qahwa) is lightly roasted, usually spiced with cardamom and brewed in a dallah. Turkish coffee is darker and ground powder-fine, then simmered with water in a cezve, grounds and all.",
  },
  {
    q: "How much coffee do I need for a cup?",
    a: (
      <>
        For pour-over we use a 1:16 ratio: 15 g of coffee to 250 g of water. See the{" "}
        <Link href="/#ratios" className={link}>
          ratio cheat sheet
        </Link>{" "}
        or watch the{" "}
        <Link href="/#grind" className={link}>
          brew guide
        </Link>
        .
      </>
    ),
  },
  {
    q: "How long does delivery take?",
    a: (
      <>
        Standard takes 3–5 business days ($5, free over $40) and express takes 1–2 ($12). See{" "}
        <Link href="/shipping" className={link}>
          shipping &amp; delivery
        </Link>
        .
      </>
    ),
  },
  {
    q: "Do you have a promo code?",
    a: "Yes: WELCOME10 takes 10% off your order. Enter it in your cart or at checkout.",
  },
  {
    q: "How should I store my beans?",
    a: "In the resealable bag, pressed flat, somewhere cool and dark. Skip the fridge: moisture and smells creep in. For longer than a month, freeze sealed portions and thaw them before opening.",
  },
];

export default function FaqPage() {
  return (
    <PageMain>
      <PageHeader eyebrow="Help" title="Questions, answered" />
      <div className="mt-8 max-w-3xl border-t border-espresso/15">
        {FAQ.map((item) => (
          <AccordionItem key={item.q} title={item.q}>
            {item.a}
          </AccordionItem>
        ))}
      </div>
      <p className="mt-8 text-[16px] text-espresso">
        Still curious?{" "}
        <Link href="/contact" className={link}>
          Contact us
        </Link>
        .
      </p>
    </PageMain>
  );
}
