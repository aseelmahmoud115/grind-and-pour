import Link from "next/link";
import { Banknote, CreditCard, Flame, ShieldCheck, Truck } from "lucide-react";
import { FooterColumn } from "@/components/footer/FooterColumn";
import { Newsletter } from "@/components/footer/Newsletter";
import { SocialIcons } from "@/components/footer/SocialIcons";
import { SITE } from "@/data/site";

const linkCls = "inline-flex min-h-11 items-center text-[15px] text-cream/85 transition-colors hover:text-cream hover:underline underline-offset-4";

const SHOP = [
  { href: "/shop", label: "All coffee" },
  { href: "/shop?roast=light", label: "Light roasts" },
  { href: "/shop?roast=dark", label: "Dark roasts" },
  { href: "/shop?style=arabic-turkish", label: "Arabic & Turkish" },
  { href: "/shop?style=decaf", label: "Decaf" },
];
const HELP = [
  { href: "/shipping", label: "Shipping & delivery" },
  { href: "/returns", label: "Returns & refunds" },
  { href: "/faq", label: "FAQ" },
  { href: "/orders", label: "Track my order" },
  { href: "/contact", label: "Contact us" },
];
const ABOUT = [
  { href: "/about", label: "Our story" },
  { href: "/#grind", label: "Brew guide" },
  { href: "/#ratios", label: "Brew ratios" },
];

const TRUST = [
  { Icon: Flame, label: "Roasted to order" },
  { Icon: Truck, label: "Free shipping over $40" },
  { Icon: ShieldCheck, label: "Secure checkout (demo)" },
];

function Links({ items }: { items: { href: string; label: string }[] }) {
  return (
    <ul>
      {items.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={linkCls}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Footer() {
  return (
    <footer className="bg-espresso text-cream">
      {/* 1. Newsletter */}
      <div className="border-b border-cream/15 px-5 py-14 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-3xl font-semibold sm:text-4xl">Fresh roasts, brew tips, and first dibs on new beans.</p>
            <p className="mt-2 text-[15px] text-cream/80">One short email a month. Unsubscribe anytime.</p>
          </div>
          <Newsletter />
        </div>
      </div>

      <div className="px-5 pt-10 pb-8 sm:px-8 lg:px-14 lg:pt-14">
        <div className="mx-auto max-w-6xl">
          {/* 2. Link columns */}
          <div className="grid md:grid-cols-2 md:gap-x-10 md:gap-y-10 lg:grid-cols-4">
            <FooterColumn title="Shop">
              <Links items={SHOP} />
              <p className="flex min-h-11 items-center gap-2">
                <Link href="/shop" className={linkCls}>
                  Gift cards
                </Link>
                <span className="eyebrow rounded-full bg-cream/15 px-2 py-1 text-[11px] text-cream">Coming soon</span>
              </p>
            </FooterColumn>
            <FooterColumn title="Help">
              <Links items={HELP} />
            </FooterColumn>
            <FooterColumn title="About">
              <Links items={ABOUT} />
            </FooterColumn>
            <FooterColumn title="Contact">
              <address className="space-y-1 pt-2 not-italic md:pt-0">
                <p>
                  <a href={`mailto:${SITE.email}`} className={linkCls}>
                    {SITE.email}
                  </a>
                </p>
                <p>
                  <a href={SITE.website.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                    {SITE.website.label}
                  </a>
                </p>
              </address>
            </FooterColumn>
          </div>

          {/* 3. Trust row */}
          <ul className="mt-10 grid gap-4 border-y border-cream/15 py-6 sm:grid-cols-3">
            {TRUST.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[15px] text-cream">
                <Icon className="size-5 shrink-0 text-cream/80" strokeWidth={1.6} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          {/* 4–5. Bottom bar. Stacked below lg (©, payments, socials). From lg, two rows:
              payments left and © · Privacy · Terms right, then the social icons below, left-aligned. */}
          <div className="mt-6 flex flex-col gap-3 text-sm text-cream/80 lg:grid lg:grid-cols-[auto_1fr] lg:items-center lg:gap-x-8 lg:gap-y-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 lg:col-start-2 lg:row-start-1 lg:justify-end lg:gap-x-2">
              <span>© 2026 Grind &amp; Pour</span>
              <span aria-hidden="true" className="hidden lg:inline">·</span>
              <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-cream hover:underline underline-offset-4">
                Privacy
              </Link>
              <span aria-hidden="true" className="hidden lg:inline">·</span>
              <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-cream hover:underline underline-offset-4">
                Terms
              </Link>
            </div>
            <ul aria-label="Payment methods (demo)" className="flex flex-wrap items-center gap-3 text-cream/85 lg:col-start-1 lg:row-start-1">
              <li className="flex items-center gap-1.5">
                <CreditCard className="size-5" strokeWidth={1.6} aria-hidden="true" />
                Card
              </li>
              <li className="flex items-center gap-1.5">
                <Banknote className="size-5" strokeWidth={1.6} aria-hidden="true" />
                Cash on delivery
              </li>
            </ul>
            <div className="mt-3 flex justify-center lg:col-span-2 lg:mt-0 lg:justify-start">
              <SocialIcons />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
