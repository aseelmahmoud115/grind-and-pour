import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { Footer } from "@/components/Footer";
import { MotionProvider } from "@/components/MotionProvider";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { StoreHydration } from "@/store/ui";
import "lenis/dist/lenis.css";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

/** Absolute base for Open Graph image URLs: the Vercel production domain when deployed. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Grind & Pour — How to brew pour-over coffee", template: "%s · Grind & Pour" },
  description:
    "A scroll-driven, step-by-step guide to pour-over coffee: grind, dial in, bloom and pour, then sip. Includes a 1:16 ratio cheat sheet.",
};

export const viewport: Viewport = {
  themeColor: "#EAD8BF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} antialiased`}>
      <body>
        <MotionProvider>
          <a
            href="#main"
            className="sr-only z-[80] rounded-full bg-espresso px-5 py-3 text-cream-light focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <StoreHydration />
          <Navbar />
          {children}
          <Footer />
          <CartDrawer />
        </MotionProvider>
      </body>
    </html>
  );
}
