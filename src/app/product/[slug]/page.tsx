import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccordionItem } from "@/components/Accordion";
import { PageMain } from "@/components/PageHeader";
import { Gallery } from "@/components/product/Gallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { Carousel } from "@/components/shop/Carousel";
import { AccentDot, ProductCard, SoldOutBadge } from "@/components/shop/ProductCard";
import { ROAST_LABELS, STYLE_LABELS, type Product } from "@/data/products";
import { CATALOG, getProduct, isArabicTurkish, relatedTo } from "@/lib/catalog";

export function generateStaticParams() {
  return CATALOG.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return { title: "Coffee not found" };
  return {
    title: product.name,
    description: `${product.short}. ${product.description}`,
    openGraph: { title: `${product.name} · Grind & Pour`, description: product.short, images: [product.images[0]] },
  };
}

const filmLink = "font-medium text-espresso underline underline-offset-4 hover:text-roast";

function BrewingTips({ product }: { product: Product }) {
  if (isArabicTurkish(product)) {
    const dallah = product.grindOptions.includes("Arabic coffee grind");
    return dallah ? (
      <>
        <p className="font-semibold">Dallah method (serves 4–6 small cups)</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>Bring 500 ml of water to the boil in the dallah or a small pot.</li>
          <li>Stir in 2 heaped tablespoons (about 15 g) of qahwa and lower the heat.</li>
          <li>Simmer gently for 10–12 minutes without letting it boil over.</li>
          <li>Rest for 2 minutes so the grounds settle, then pour into small cups. Serve with dates.</li>
        </ol>
      </>
    ) : (
      <>
        <p className="font-semibold">Cezve method (one cup)</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>Add 70 ml of cold water, 7 g (a heaped teaspoon) of coffee, and sugar if you like, to the cezve.</li>
          <li>Stir once, then heat slowly on low.</li>
          <li>Take it off the heat as soon as the foam rises. Don&apos;t let it boil.</li>
          <li>Spoon the foam into the cup, pour, and let it settle for a minute before sipping.</li>
        </ol>
      </>
    );
  }
  return (
    <>
      <p>
        Our home-page film walks through a pour-over step by step: 15 g of coffee, 250 g of water at 92–96 °C, a 30 g
        bloom, then slow spirals for a 2:30–3:30 brew.
      </p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/#grind" className={filmLink}>
          01 Grind
        </Link>
        <Link href="/#dial-in" className={filmLink}>
          02 Dial in
        </Link>
        <Link href="/#pour" className={filmLink}>
          03 Pour
        </Link>
        <Link href="/#sip" className={filmLink}>
          04 Sip
        </Link>
      </p>
      {product.style === "blend" && (
        <p className="mt-3">For espresso, start at 18 g in and 36 g out in 27–32 seconds, then adjust the grind.</p>
      )}
    </>
  );
}

/**
 * The params-dependent content sits inside Suspense, so navigations can show the
 * page shell instantly. Every slug from generateStaticParams still prerenders in full.
 */
export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <PageMain className="lg:pt-[calc(var(--nav-h)+3rem)]">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails params={params} />
      </Suspense>
    </PageMain>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16" aria-hidden="true">
      <div className="aspect-[3/4] animate-pulse rounded-3xl bg-cream-light" />
      <div className="space-y-4 pt-10">
        <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-cream-light" />
        <div className="h-6 w-1/2 animate-pulse rounded-xl bg-cream-light" />
        <div className="h-24 animate-pulse rounded-2xl bg-cream-light" />
      </div>
    </div>
  );
}

async function ProductDetails({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const related = relatedTo(product);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-roast">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/shop" className="inline-flex min-h-11 items-center hover:text-espresso hover:underline">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/shop?style=${product.style}`} className="inline-flex min-h-11 items-center hover:text-espresso hover:underline">
              {STYLE_LABELS[product.style]}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-espresso">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
          <Gallery images={product.images} cupImage={product.cupImage} name={product.name} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow inline-flex items-center gap-2 text-roast">
              <AccentDot color={product.accent} />
              {ROAST_LABELS[product.roast]} roast · {STYLE_LABELS[product.style]}
            </span>
            {product.stock <= 0 && <SoldOutBadge />}
          </div>
          <h1 className="font-display mt-3 text-5xl leading-[0.95] font-black tracking-tight text-espresso [font-variation-settings:'SOFT'_100,'WONK'_1] sm:text-6xl">
            {product.name}
          </h1>
          <p className="mt-4 text-lg text-roast">{product.short}</p>
          <p className="mt-4 text-[17px] leading-relaxed text-espresso">{product.description}</p>

          <div className="mt-8">
            <ProductPurchase product={product} />
          </div>

          <div className="mt-10 border-t border-espresso/15">
            <AccordionItem title="Details" defaultOpen>
              <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 gap-y-2">
                {product.details.map((d) => (
                  <div key={d.label} className="contents">
                    <dt className="text-roast">{d.label}</dt>
                    <dd>{d.value}</dd>
                  </div>
                ))}
              </dl>
            </AccordionItem>
            <AccordionItem title="Brewing tips">
              <BrewingTips product={product} />
            </AccordionItem>
            <AccordionItem title="Shipping & returns">
              <p>
                Roasted to order and shipped within 2 business days. Standard delivery (3–5 days) is $5, or free over $40;
                express (1–2 days) is $12. Unopened bags can be returned within 14 days.
              </p>
              <p className="mt-3 flex gap-4">
                <Link href="/shipping" className={filmLink}>
                  Shipping details
                </Link>
                <Link href="/returns" className={filmLink}>
                  Returns
                </Link>
              </p>
            </AccordionItem>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-20 lg:mt-28">
          <Carousel
            label="Related products"
            title={
              <h2 id="related-title" className="font-display text-3xl font-semibold text-espresso sm:text-4xl">
                You might also like
              </h2>
            }
            itemClassName="w-[80%] md:w-[45%] lg:w-[calc((100%-3rem)/4)]"
            trackClassName="-mx-2 scroll-px-2 px-2 pt-2 pb-8"
          >
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} sizes="(min-width: 1024px) 22vw, (min-width: 768px) 45vw, 80vw" />
            ))}
          </Carousel>
        </section>
      )}
    </>
  );
}
