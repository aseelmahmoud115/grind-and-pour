import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Carousel } from "@/components/shop/Carousel";
import { FadeUp } from "@/components/shop/FadeUp";
import { ProductCard } from "@/components/shop/ProductCard";
import { CATALOG } from "@/lib/catalog";

/**
 * Below lg: the cup, then one carousel of every coffee.
 * From lg: the first three coffees float around the cup (the signature layout),
 * with the rest in a carousel underneath. Each list is display:none at the other
 * breakpoint, so a card is only ever exposed once.
 */
const FEATURED = CATALOG.slice(0, 3);
const MORE = CATALOG.slice(3);
const AREAS = ["card-a", "card-b", "card-c"];
/** Card image widths: the slide (80% / 45% of the track) or the 19rem lg card, minus the card padding. */
const CARD_SIZES = "(min-width: 1024px) 17.5rem, (min-width: 768px) calc(45vw - 3.3rem), (min-width: 640px) calc(80vw - 4.7rem), calc(80vw - 3.2rem)";
/** A quarter of the max-w-7xl, px-14 track (less three 1rem gaps), minus the card padding. */
const MORE_SIZES = "(min-width: 1280px) 16rem, calc(25vw - 4rem)";

export function FindYourCup() {
  return (
    <section id="beans" aria-labelledby="beans-title" className="relative scroll-mt-[var(--nav-h)] overflow-hidden bg-cream py-24 lg:py-32">
      <h2 id="beans-title" className="display relative text-center text-espresso">
        <span className="block">Find</span>
        <span className="block text-terracotta">your</span>
        <span className="block">cup</span>
      </h2>

      <div className="cup-grid relative mx-auto -mt-10 max-w-7xl px-5 sm:px-8 lg:-mt-16 lg:px-14">
        {/* Decorative centrepiece, not a product. */}
        <div className="cup pointer-events-none relative z-10 mx-auto aspect-square w-full max-w-[22rem] lg:max-w-[34rem]">
          <Image
            src="/images/cup.webp"
            alt="A speckled ceramic cup of black pour-over coffee on a saucer"
            fill
            sizes="(min-width: 1024px) 34rem, 22rem"
            className="cup-mask object-cover"
          />
        </div>

        {/* lg+: three cards float around the cup. */}
        <ul className="hidden lg:contents">
          {FEATURED.map((p, i) => (
            <li key={p.slug} className={`relative z-20 w-[19rem] ${AREAS[i]}`}>
              <FadeUp delay={i * 0.12} className="h-full">
                <ProductCard product={p} sizes={CARD_SIZES} />
              </FadeUp>
            </li>
          ))}
        </ul>

        {/* Below lg: every coffee in one carousel. */}
        <Carousel
          label="Products"
          title={<h3 className="font-display text-2xl font-semibold text-espresso sm:text-3xl">All our coffees</h3>}
          className="lg:hidden"
          trackClassName="-mx-2 scroll-px-2 px-2 pt-2 pb-8"
        >
          {CATALOG.map((p, i) => (
            <FadeUp key={p.slug} delay={Math.min(i, 2) * 0.12} className="h-full">
              <ProductCard product={p} sizes={CARD_SIZES} />
            </FadeUp>
          ))}
        </Carousel>
      </div>

      {/* lg+: the rest of the range under the floating cards. */}
      {MORE.length > 0 && (
        <div className="mx-auto mt-16 hidden max-w-7xl px-14 lg:block">
          <Carousel
            label="More coffees"
            title={<h3 className="font-display text-3xl font-semibold text-espresso">More from the roastery</h3>}
            itemClassName="w-[calc((100%-3rem)/4)]"
            trackClassName="-mx-2 scroll-px-2 px-2 pt-2 pb-8"
          >
            {MORE.map((p) => (
              <ProductCard key={p.slug} product={p} sizes={MORE_SIZES} />
            ))}
          </Carousel>
        </div>
      )}

      <div className="mt-12 flex justify-center px-5 lg:mt-10">
        <Link
          href="/shop"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-espresso px-7 text-[15px] font-medium text-cream-light transition-colors duration-200 hover:bg-roast"
        >
          Shop all coffee
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
