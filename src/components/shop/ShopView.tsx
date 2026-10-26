"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ROAST_LABELS, STYLE_LABELS, type Roast, type Style } from "@/data/products";
import { CATALOG, filterAndSort, type SortKey } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

const ROASTS = Object.keys(ROAST_LABELS) as Roast[];
const STYLES = Object.keys(STYLE_LABELS) as Style[];
const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price ↑ (low to high)" },
  { value: "price-desc", label: "Price ↓ (high to low)" },
];

const pick = <T extends string>(value: string | null, allowed: readonly T[]) =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : null;

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-11 cursor-pointer items-center rounded-full border px-4 text-[15px] font-medium whitespace-nowrap transition-colors ${
        pressed ? "border-espresso bg-espresso text-cream-light" : "border-espresso/25 bg-cream-light text-espresso hover:border-espresso"
      }`}
    >
      {children}
    </button>
  );
}

/** Grid + filters; state lives in the URL (?roast=light&style=single-origin&sort=price-asc). */
export function ShopView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const roast = pick(params.get("roast"), ROASTS);
  const style = pick(params.get("style"), STYLES);
  const sort = pick(params.get("sort"), SORTS.map((s) => s.value)) ?? "featured";

  const update = (next: Partial<Record<"roast" | "style" | "sort", string | null>>) => {
    const qs = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === "sort" && value === "featured")) qs.set(key, value);
      else qs.delete(key);
    }
    const query = qs.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const results = filterAndSort(CATALOG, { roast, style }, sort);

  return <ShopGrid {...{ roast, style, sort, results, update }} />;
}

/** Also rendered (unfiltered) as the static fallback before the URL is read. */
export function ShopGrid({
  roast = null,
  style = null,
  sort = "featured",
  results = CATALOG,
  update,
}: {
  roast?: Roast | null;
  style?: Style | null;
  sort?: SortKey;
  results?: typeof CATALOG;
  update?: (next: Partial<Record<"roast" | "style" | "sort", string | null>>) => void;
}) {
  const set = update ?? (() => {});
  return (
    <div className="mt-10">
      <div className="flex flex-col gap-5 border-y border-espresso/10 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="eyebrow mb-2 text-roast">Roast</legend>
            <div className="flex flex-wrap gap-2">
              <Chip pressed={!roast} onClick={() => set({ roast: null })}>
                All
              </Chip>
              {ROASTS.map((r) => (
                <Chip key={r} pressed={roast === r} onClick={() => set({ roast: roast === r ? null : r })}>
                  {ROAST_LABELS[r]}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="eyebrow mb-2 text-roast">Style</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STYLE_LABELS) as Style[]).map((s) => (
                <Chip key={s} pressed={style === s} onClick={() => set({ style: style === s ? null : s })}>
                  {STYLE_LABELS[s]}
                </Chip>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex items-end justify-between gap-4">
          <p aria-live="polite" className="text-[15px] text-roast lg:hidden">
            {results.length} {results.length === 1 ? "coffee" : "coffees"}
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-roast">Sort</span>
            <select
              value={sort}
              onChange={(e) => set({ sort: e.target.value })}
              className="h-11 cursor-pointer rounded-full border border-espresso/25 bg-cream-light px-4 text-[15px] text-espresso"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p aria-live="polite" className="mt-5 hidden text-[15px] text-roast lg:block">
        {results.length} {results.length === 1 ? "coffee" : "coffees"}
      </p>

      {results.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-3xl bg-cream-light px-6 py-16 text-center">
          <p className="font-display text-3xl font-semibold text-espresso">No coffees match those filters</p>
          <p className="mt-3 max-w-sm text-[15px] text-roast">Try another roast or style, or clear the filters to see everything we roast.</p>
          <button
            type="button"
            onClick={() => set({ roast: null, style: null })}
            className="mt-6 inline-flex h-12 cursor-pointer items-center rounded-full bg-espresso px-7 text-[15px] font-medium text-cream-light transition-colors hover:bg-roast"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
        <h2 className="sr-only">Coffees</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {results.map((p, i) => (
            <li key={p.slug}>
              <ProductCard product={p} priority={i < 4} sizes="(min-width: 1392px) 17.4rem, (min-width: 1024px) calc(25vw - 4.4rem), (min-width: 768px) calc(33.3vw - 3.7rem), (min-width: 640px) calc(50vw - 4.1rem), calc(50vw - 2.9rem)" />
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}
