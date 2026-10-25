/**
 * The Grind & Pour catalog (demo brand): coffee only. All prices are in USD.
 *
 * Images follow a convention: public/images/products/<slug>/1.webp, 2.webp, …
 * Every product lists the candidate paths; only the files that exist at build
 * time are used (see src/lib/catalog.ts), and coffees with no photo are hidden.
 */
export type Roast = "light" | "medium" | "dark";
export type Style = "single-origin" | "blend" | "arabic-turkish" | "decaf";

export type Variant = { id: string; label: string; priceDelta: number };

export type Product = {
  slug: string;
  name: string;
  roast: Roast;
  style: Style;
  /** Base price in USD (250 g). */
  price: number;
  /** Bag sizes. */
  variants: Variant[];
  grindOptions: string[];
  /** First = card image. Missing files are skipped. */
  images: string[];
  /**
   * "In the cup" photo for the Brew Reveal (3:4, cream background).
   * Falls back to /images/cup.webp until the product's own file exists.
   */
  cupImage: string;
  /**
   * Centre of the liquid surface in the cup photo, in % of the 3:4 image, where the
   * steam starts. Positions the steam emitter and the accent glow.
   * Default { x: 50, y: 38 }.
   */
  steamAt?: { x: number; y: number };
  /** Width of the steam emitter along the liquid surface, in % of the image width. Default 18. */
  rimWidth?: number;
  /** One line for cards. */
  short: string;
  /** Two or three sentences. */
  description: string;
  /** Origin, region, process, altitude, roast, tasting notes, best for. */
  details: { label: string; value: string }[];
  /** Label colour of the bag, for small UI accents (dot, badge). */
  accent: string;
  /** Demo stock; 0 shows "Sold out". */
  stock: number;
};

export const ROAST_LABELS: Record<Roast, string> = { light: "Light", medium: "Medium", dark: "Dark" };
export const STYLE_LABELS: Record<Style, string> = {
  "single-origin": "Single origin",
  blend: "Blends",
  "arabic-turkish": "Arabic & Turkish",
  decaf: "Decaf",
};

const MAX_IMAGES = 8;
const gallery = (slug: string) =>
  Array.from({ length: MAX_IMAGES }, (_, i) => `/images/products/${slug}/${i + 1}.webp`);

const SIZES: Variant[] = [
  { id: "250g", label: "250 g", priceDelta: 0 },
  { id: "500g", label: "500 g", priceDelta: 14 },
  { id: "1kg", label: "1 kg", priceDelta: 26 },
];

export const GRIND_OPTIONS = ["Whole bean", "Pour-over", "French press", "Espresso", "Turkish (extra fine)"];

const coffee = (
  p: Omit<Product, "variants" | "grindOptions" | "images" | "cupImage"> & { grindOptions?: string[] },
): Product => ({
  variants: SIZES,
  grindOptions: GRIND_OPTIONS,
  images: gallery(p.slug),
  cupImage: `/images/products/${p.slug}/cup.webp`,
  ...p,
});

export const PRODUCTS: Product[] = [
  coffee({
    slug: "sage-morning",
    steamAt: { x: 49, y: 53 },
    rimWidth: 20,
    name: "Sage Morning",
    roast: "light",
    style: "single-origin",
    price: 18,
    short: "Ethiopia Yirgacheffe · jasmine, lemon, honey",
    description:
      "A delicate, tea-like Yirgacheffe that opens with jasmine and settles into lemon zest and wildflower honey. Washed and roasted light so the florals stay clear in the cup.",
    details: [
      { label: "Origin", value: "Ethiopia" },
      { label: "Region", value: "Yirgacheffe, Gedeo zone" },
      { label: "Process", value: "Washed" },
      { label: "Altitude", value: "1,900–2,200 m" },
      { label: "Roast", value: "Light" },
      { label: "Tasting notes", value: "Jasmine, lemon, honey" },
      { label: "Best for", value: "V60 and other pour-over" },
    ],
    accent: "#93A88A",
    stock: 24,
  }),
  coffee({
    slug: "terracotta-hearth",
    steamAt: { x: 50, y: 53 },
    rimWidth: 20,
    name: "Terracotta Hearth",
    roast: "medium",
    style: "single-origin",
    price: 16,
    short: "Colombia Huila · caramel, cocoa, red apple",
    description:
      "Our everyday cup: round and comforting, with caramel sweetness, a cocoa middle and a crisp red-apple finish. Forgiving to brew and easy to love, black or with a splash of milk.",
    details: [
      { label: "Origin", value: "Colombia" },
      { label: "Region", value: "Huila" },
      { label: "Process", value: "Washed" },
      { label: "Altitude", value: "1,600–1,900 m" },
      { label: "Roast", value: "Medium" },
      { label: "Tasting notes", value: "Caramel, cocoa, red apple" },
      { label: "Best for", value: "Pour-over, French press, drip" },
    ],
    accent: "#B4572F",
    stock: 30,
  }),
  coffee({
    slug: "sky-drift",
    steamAt: { x: 50, y: 53 },
    rimWidth: 20,
    name: "Sky Drift",
    roast: "light",
    style: "single-origin",
    price: 19,
    short: "Kenya AA, Nyeri · blackcurrant, grapefruit",
    description:
      "Juicy and bold, the way great Kenyan coffee should be: blackcurrant and pink grapefruit over a syrupy body. A light-medium roast keeps the acidity lively without letting it turn sharp.",
    details: [
      { label: "Origin", value: "Kenya" },
      { label: "Region", value: "Nyeri" },
      { label: "Process", value: "Washed" },
      { label: "Altitude", value: "1,700–1,900 m" },
      { label: "Roast", value: "Light-medium" },
      { label: "Tasting notes", value: "Blackcurrant, grapefruit" },
      { label: "Best for", value: "V60, Kalita, AeroPress" },
    ],
    accent: "#A7C4E2",
    stock: 6,
  }),
  coffee({
    slug: "midnight-roast",
    steamAt: { x: 50, y: 53 },
    rimWidth: 22,
    name: "Midnight Roast",
    roast: "dark",
    style: "single-origin",
    price: 15,
    short: "Brazil Cerrado · dark chocolate, molasses, toasted nut",
    description:
      "Deep, low-acid and generous: dark chocolate and molasses with a toasted-nut finish. A natural Cerrado roasted dark, built for milk drinks and still smooth as a slow pour-over.",
    details: [
      { label: "Origin", value: "Brazil" },
      { label: "Region", value: "Cerrado Mineiro" },
      { label: "Process", value: "Natural" },
      { label: "Altitude", value: "1,000–1,200 m" },
      { label: "Roast", value: "Dark" },
      { label: "Tasting notes", value: "Dark chocolate, molasses, toasted nut" },
      { label: "Best for", value: "Espresso with milk, moka pot, French press" },
    ],
    accent: "#1E1A17",
    stock: 20,
  }),
  coffee({
    slug: "golden-hour",
    steamAt: { x: 50, y: 53 },
    rimWidth: 20,
    name: "Golden Hour",
    roast: "medium",
    style: "single-origin",
    price: 17,
    short: "Guatemala Huehuetenango · brown sugar, orange, almond",
    description:
      "Grown high in Huehuetenango, this washed Guatemalan tastes like late-afternoon light: brown sugar, sweet orange and a soft almond finish. Balanced enough for any brewer you own.",
    details: [
      { label: "Origin", value: "Guatemala" },
      { label: "Region", value: "Huehuetenango" },
      { label: "Process", value: "Washed" },
      { label: "Altitude", value: "1,700–2,000 m" },
      { label: "Roast", value: "Medium" },
      { label: "Tasting notes", value: "Brown sugar, orange, almond" },
      { label: "Best for", value: "Chemex, V60, drip" },
    ],
    accent: "#D3A23F",
    stock: 18,
  }),
  coffee({
    slug: "haraz-mocha",
    steamAt: { x: 50, y: 53 },
    rimWidth: 18,
    name: "Haraz Mocha",
    roast: "medium",
    style: "single-origin",
    price: 26,
    short: "Yemen, Haraz mountains · dried fig, raisin, warm spice",
    description:
      "From terraced farms in the Haraz mountains, one of coffee's oldest homes. Sun-dried naturally, it's rich with dried fig, raisin and warm spice: a rare, slow-sipping cup.",
    details: [
      { label: "Origin", value: "Yemen" },
      { label: "Region", value: "Haraz mountains" },
      { label: "Process", value: "Natural, sun-dried" },
      { label: "Altitude", value: "1,800–2,400 m" },
      { label: "Roast", value: "Medium" },
      { label: "Tasting notes", value: "Dried fig, raisin, warm spice" },
      { label: "Best for", value: "Pour-over, cezve, dallah" },
    ],
    accent: "#C98B8B",
    stock: 4,
  }),
  coffee({
    slug: "cardamom-qahwa",
    steamAt: { x: 50, y: 53 },
    rimWidth: 18,
    name: "Cardamom Qahwa",
    roast: "light",
    style: "arabic-turkish",
    price: 14,
    grindOptions: ["Arabic coffee grind"],
    short: "Arabic coffee blend · green cardamom, honey, light & fragrant",
    description:
      "A traditional Arabic coffee: lightly roasted beans ground with green cardamom for a golden, fragrant cup with a honeyed finish. Pour it small, from a dallah, alongside dates.",
    details: [
      { label: "Origin", value: "Blend of Ethiopian and Yemeni arabica" },
      { label: "Region", value: "Blended in Cairo" },
      { label: "Process", value: "Washed and natural" },
      { label: "Altitude", value: "1,500–2,200 m" },
      { label: "Roast", value: "Light, with green cardamom" },
      { label: "Tasting notes", value: "Cardamom, honey, light & fragrant" },
      { label: "Best for", value: "Dallah (Arabic coffee pot)" },
    ],
    accent: "#7E8B4E",
    stock: 26,
  }),
  coffee({
    slug: "turkish-gold",
    steamAt: { x: 50, y: 52 },
    rimWidth: 18,
    name: "Turkish Gold",
    roast: "dark",
    style: "arabic-turkish",
    price: 13,
    grindOptions: ["Turkish (extra fine)"],
    short: "Brazil & Ethiopia blend · cocoa, roasted hazelnut, thick foam",
    description:
      "Ground powder-fine for the cezve, this medium-dark blend brews up thick and velvety with cocoa, roasted hazelnut and a generous crema-like foam. Lovely plain or with a little sugar.",
    details: [
      { label: "Origin", value: "Brazil & Ethiopia" },
      { label: "Region", value: "Sul de Minas and Sidama" },
      { label: "Process", value: "Natural and washed" },
      { label: "Altitude", value: "1,100–2,000 m" },
      { label: "Roast", value: "Medium-dark" },
      { label: "Tasting notes", value: "Cocoa, roasted hazelnut, thick foam" },
      { label: "Best for", value: "Cezve / ibrik" },
    ],
    accent: "#A8643A",
    stock: 22,
  }),
  coffee({
    slug: "velvet-shot",
    steamAt: { x: 50, y: 52 },
    rimWidth: 18,
    name: "Velvet Shot Espresso",
    roast: "dark",
    style: "blend",
    price: 17,
    short: "Brazil, Colombia & Ethiopia · milk chocolate, cherry, syrupy",
    description:
      "Our espresso blend, built for body: a syrupy shot of milk chocolate with a bright cherry lift from the Ethiopian component. It cuts through milk beautifully in a flat white.",
    details: [
      { label: "Origin", value: "Brazil, Colombia & Ethiopia" },
      { label: "Region", value: "Mogiana, Huila and Guji" },
      { label: "Process", value: "Natural and washed" },
      { label: "Altitude", value: "1,100–2,100 m" },
      { label: "Roast", value: "Medium-dark" },
      { label: "Tasting notes", value: "Milk chocolate, cherry, syrupy" },
      { label: "Best for", value: "Espresso, flat white, moka pot" },
    ],
    accent: "#7A2E3A",
    stock: 14,
  }),
  coffee({
    slug: "night-owl-decaf",
    steamAt: { x: 50, y: 53 },
    rimWidth: 22,
    name: "Night Owl Decaf",
    roast: "medium",
    style: "decaf",
    price: 16,
    short: "Colombia · Swiss Water decaf · cocoa, caramel, soft",
    description:
      "All the comfort, none of the late-night buzz. Decaffeinated with only water by the Swiss Water process, it keeps a soft cocoa-and-caramel sweetness that tastes like the real thing.",
    details: [
      { label: "Origin", value: "Colombia" },
      { label: "Region", value: "Cauca" },
      { label: "Process", value: "Washed, Swiss Water decaf" },
      { label: "Altitude", value: "1,500–1,800 m" },
      { label: "Roast", value: "Medium" },
      { label: "Tasting notes", value: "Cocoa, caramel, soft" },
      { label: "Best for", value: "Pour-over, French press, evening cups" },
    ],
    accent: "#2F3E5C",
    stock: 0,
  }),
];
