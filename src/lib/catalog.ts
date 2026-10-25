import { PRODUCTS, type Product, type Roast, type Style } from "@/data/products";
import imageManifest from "@/data/product-images.generated.json";
import { toCents } from "@/lib/money";

/**
 * Product images that exist on disk, recorded at build time by
 * scripts/scan-product-images.mjs (fs.existsSync). Runtime code never touches
 * the file system, so this behaves the same on Vercel's serverless functions.
 */
const onDisk = new Set(Object.values(imageManifest as Record<string, string[]>).flat());

/** Shared "in the cup" photo, used until a coffee's own cup.webp exists. */
export const FALLBACK_CUP = "/images/cup.webp";
/** Liquid-surface centre for cup photos framed like ours (3:4, cup centred). */
export const DEFAULT_STEAM_AT = { x: 50, y: 53 };

/** Coffees with at least one photo, with their image lists trimmed to the files that exist. */
export const CATALOG: Product[] = PRODUCTS.map((p) => ({
  ...p,
  images: p.images.filter((src) => onDisk.has(src)),
  cupImage: onDisk.has(p.cupImage) ? p.cupImage : FALLBACK_CUP,
})).filter((p) => p.images.length > 0);

/** "Jasmine, lemon, honey" → ["jasmine", "lemon", "honey"], for the tasting-note pills. */
export const tastingNotes = (p: Product) =>
  (p.details.find((d) => d.label === "Tasting notes")?.value ?? "")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

export const getProduct = (slug: string) => CATALOG.find((p) => p.slug === slug);

export const unitPriceCents = (p: Product, variantId: string) =>
  toCents(p.price + (p.variants.find((v) => v.id === variantId)?.priceDelta ?? 0));

/** Pour-over coffees link to the home film; Arabic & Turkish coffees get their own method. */
export const isArabicTurkish = (p: Product) => p.style === "arabic-turkish";

/** Same roast or style first (both > one), then the rest; never the product itself. */
export function relatedTo(p: Product, limit = 6) {
  const score = (o: Product) => Number(o.roast === p.roast) + Number(o.style === p.style);
  return CATALOG.filter((o) => o.slug !== p.slug)
    .map((o, i) => ({ o, i, s: score(o) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map(({ o }) => o);
}

export type ShopFilters = { roast: Roast | null; style: Style | null };
export type SortKey = "featured" | "price-asc" | "price-desc";

export function filterAndSort(list: Product[], { roast, style }: ShopFilters, sort: SortKey) {
  const out = list.filter((p) => (!roast || p.roast === roast) && (!style || p.style === style));
  if (sort === "price-asc") return [...out].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return [...out].sort((a, b) => b.price - a.price);
  return out;
}
