import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PageMain>
      <PageHeader eyebrow="Legal" title="Privacy" intro="Short version: this demo collects nothing." />
      <div className="prose-gp mt-8">
        <h2>What stays on your device</h2>
        <p>
          Your cart and your demo orders are saved in your browser&apos;s local storage so they survive a refresh. They
          never leave your device, and you can clear them by clearing this site&apos;s data.
        </p>
        <h2>What we never collect</h2>
        <ul>
          <li>Card details: the demo card form is checked in memory and cleared on submit. It is never stored, logged or sent.</li>
          <li>Form messages: the newsletter and contact forms only validate on the page; nothing is sent.</li>
          <li>Analytics or tracking cookies: there are none.</li>
        </ul>
      </div>
    </PageMain>
  );
}
