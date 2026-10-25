import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHeader, PageMain } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Contact us", description: "Get in touch with Grind & Pour (demo store)." };

export default function ContactPage() {
  return (
    <PageMain>
      <PageHeader
        eyebrow="Help"
        title="Contact us"
        intro="Questions about an order, a roast or brewing? Write to us. (This is a demo: the form checks your details but doesn't send anything.)"
      />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <ContactForm />
        <address className="space-y-2 text-[16px] text-espresso not-italic">
          <p className="eyebrow text-roast">Roastery</p>
          <p>Cairo, Egypt</p>
          <p>Sun–Thu 10:00–18:00</p>
          <p>hello@grindandpour.demo</p>
          <p className="text-sm text-roast">A demo address: this inbox isn&apos;t monitored.</p>
        </address>
      </div>
    </PageMain>
  );
}
