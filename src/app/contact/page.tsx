import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHeader, PageMain } from "@/components/PageHeader";
import { SITE } from "@/data/site";

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
          <p className="eyebrow text-roast">Contact</p>
          <p>
            <a href={`mailto:${SITE.email}`} className="underline underline-offset-4 hover:text-roast">
              {SITE.email}
            </a>
          </p>
          <p>
            <a href={SITE.website.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-roast">
              {SITE.website.label}
            </a>
          </p>
        </address>
      </div>
    </PageMain>
  );
}
