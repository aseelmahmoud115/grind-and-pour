"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCartView } from "@/components/shop/cart-hooks";
import { setNavHeight } from "@/lib/hooks";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useUi } from "@/store/ui";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?style=single-origin", label: "Single origin" },
  { href: "/shop?style=arabic-turkish", label: "Arabic & Turkish" },
  { href: "/#grind", label: "Brew guide" },
];

/**
 * usePathname suspends on routes whose params are only known at request time
 * (/order/[id]), so the navbar sits in its own Suspense boundary; the fallback
 * is the solid (non-home) navbar.
 */
export function Navbar() {
  return (
    <Suspense fallback={<NavbarView home={false} />}>
      <NavbarForPath />
    </Suspense>
  );
}

function NavbarForPath() {
  return <NavbarView home={usePathname() === "/"} />;
}

function CartButton() {
  const { count, hydrated } = useCartView();
  const openDrawer = useUi((s) => s.openDrawer);
  const label = hydrated && count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart, empty";
  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={label}
      className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-espresso transition-colors hover:bg-espresso/10"
    >
      <ShoppingBag className="size-[22px]" strokeWidth={1.6} aria-hidden="true" />
      {/* Absolutely positioned, so the badge appearing or bumping never moves anything. */}
      {hydrated && count > 0 && (
        <motion.span
          key={count}
          aria-hidden="true"
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9A4524] px-1 text-[11px] leading-none font-semibold text-cream-light tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </button>
  );
}

function NavbarView({ home }: { home: boolean }) {
  const [open, setOpen] = useState(false);
  const [pastFilm, setPastFilm] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useFocusTrap(sheet, open, close);

  // Publish the real navbar height as --nav-h, so page and scene copy always start below it.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setNavHeight(entry.borderBoxSize[0].blockSize));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // On the home page the bar is transparent over the film and turns solid after it.
  useEffect(() => {
    if (!home) return;
    const onScroll = () => {
      const method = document.getElementById("method");
      setPastFilm(!!method && method.getBoundingClientRect().bottom <= (header.current?.offsetHeight ?? 72));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  const solid = !home || pastFilm || open;
  const pill = solid ? "" : "bg-cream-light/85";

  return (
    <header
      ref={header}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? "border-b border-espresso/10 bg-cream/95 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-[72px] max-w-[96rem] items-center justify-between px-5 sm:px-8 lg:px-14">
        <Link
          href="/"
          className={`font-display -ml-4 rounded-full px-4 py-1.5 text-2xl font-semibold tracking-tight whitespace-nowrap text-espresso transition-colors duration-300 ${pill}`}
        >
          Grind &amp; Pour
        </Link>

        <div className={`flex items-center gap-1 rounded-full pl-2 transition-colors duration-300 lg:gap-6 lg:pl-6 ${pill}`}>
          <ul className="hidden items-center gap-6 lg:flex xl:gap-8">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="eyebrow inline-flex h-11 items-center whitespace-nowrap text-espresso underline-offset-8 transition-colors hover:text-roast hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <CartButton />
          <button
            type="button"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-espresso/30 text-espresso lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
          >
            <span className="sr-only">Open menu</span>
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {open && (
        <div
          ref={sheet}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[60] flex h-dvh flex-col bg-cream lg:hidden"
        >
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-espresso/10 px-5 sm:px-8">
            <Link href="/" onClick={close} className="font-display text-2xl font-semibold tracking-tight text-espresso">
              Grind &amp; Pour
            </Link>
            <button
              type="button"
              onClick={close}
              data-autofocus
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-espresso/30 text-espresso"
            >
              <span className="sr-only">Close menu</span>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-6 sm:px-8">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className="font-display block py-3 text-4xl font-semibold text-espresso">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="px-5 pb-8 text-sm text-roast sm:px-8">Demo store · no real payments are taken.</p>
        </div>
      )}
    </header>
  );
}
