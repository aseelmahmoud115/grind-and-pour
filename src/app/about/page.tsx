import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageMain } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Our story", description: "About Grind & Pour, a demo coffee roaster from Cairo." };

export default function AboutPage() {
  return (
    <PageMain>
      <PageHeader eyebrow="About" title="Our story" intro="A small (and entirely fictional) roastery that believes a better cup starts at home." />
      <div className="prose-gp mt-8">
        <p>
          Grind &amp; Pour started with a kettle, a hand grinder and a habit of over-explaining pour-over to friends. The
          idea was simple: if brewing great coffee is a few small, learnable steps, show the steps, then sell beans that
          reward them.
        </p>
        <h2>What we roast</h2>
        <p>
          Single origins chosen for clarity, a dependable espresso blend, a decaf we&apos;d drink at any hour, and the
          Arabic and Turkish coffees we grew up with. Everything is roasted to order in small batches.
        </p>
        <h2>How we brew</h2>
        <p>
          The <Link href="/#grind">brew guide</Link> on our home page walks through the method we use every morning:
          15 g of coffee, 250 g of water, a 30-second bloom and slow spirals. The <Link href="/#ratios">ratio cheat
          sheet</Link> scales it up for two or three cups.
        </p>
        <h2>About this site</h2>
        <p>
          Grind &amp; Pour is a demo project by Aseel Alqedra. Products, prices and policies are illustrative, no payments
          are taken, and the visuals were generated with AI. The layout is inspired by a concept by Cool Vision Studio.
        </p>
      </div>
    </PageMain>
  );
}
