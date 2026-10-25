# Grind & Pour

A cinematic, scroll-driven pour-over guide plus a **demo** coffee store (Next.js 16, App Router).
No backend: the cart and past orders live in the browser (zustand + localStorage), and payments are simulated.
**No money moves and no card data is stored or sent anywhere.**

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (also used by Vercel)
npm run lint
npm run test:e2e     # Playwright end-to-end tests (needs a build; see below)
```

## Routes

| Route | What it is |
|---|---|
| `/` | The scroll film, the ratio cheat sheet, and "Find your cup" product cards |
| `/shop` | All coffees; roast and style filters + sort, kept in the URL (`/shop?roast=light&style=single-origin&sort=price-asc`) |
| `/product/[slug]` | Product page (statically generated per coffee) |
| `/cart` | Full cart with promo code (`WELCOME10` = 10% off) |
| `/checkout` | 3-step demo checkout: contact & shipping, delivery, payment |
| `/order/[id]` | Order confirmation (read from this browser's saved orders) |
| `/orders` | Past demo orders on this device |
| `/shipping`, `/returns`, `/faq`, `/contact`, `/about`, `/privacy`, `/terms` | Info pages |

Demo payment: use the test card **4242 4242 4242 4242**, any future expiry (MM/YY) and any 3-digit CVC,
or choose cash on delivery. Any other card number is rejected with a demo message.

## Products and images

The catalog is in [`src/data/products.ts`](src/data/products.ts). Photos follow a convention:

```
public/images/products/<slug>/1.webp   ← card + main image (3:4, e.g. 900×1200)
public/images/products/<slug>/2.webp   ← extra gallery photos (optional, up to 8)
public/images/products/<slug>/cup.webp ← "in the cup" photo for the Brew Reveal hover (3:4, cream background)
```

Until a coffee has its own `cup.webp`, the Brew Reveal and the product page's "In the cup" toggle use the shared
`/images/cup.webp`. The steam position can be tuned per coffee with `steamAt` (in % of the image) in `products.ts`.

**A coffee without a photo is hidden** from the shop, the home page, related products and static product pages.
`scripts/scan-product-images.mjs` checks which files exist (`fs.existsSync`) and writes
`src/data/product-images.generated.json`. It runs automatically before `npm run dev` and `npm run build`
(`predev` / `prebuild`), so on Vercel it runs as part of every deploy.

To add a photo (or a new coffee):

1. Add the coffee to `PRODUCTS` in `src/data/products.ts` (if it's new). Its `slug` is the folder name.
2. Drop the image at `public/images/products/<slug>/1.webp` (add `2.webp`, `3.webp`, … for a gallery).
3. Run `npm run dev` or `npm run build` (or `npm run scan-images` on its own). The coffee appears automatically.

Runtime code never reads the file system, so this works the same locally and on Vercel's serverless functions.

## End-to-end tests

The tests in `e2e/` run against a production server on port 3100 using your installed Google Chrome:

```bash
npm run build
npm run test:e2e
```

## Credits

Demo project by Aseel Alqedra ([github.com/aseelmahmoud115](https://github.com/aseelmahmoud115)).
Visuals generated with AI. Layout inspired by a concept by Cool Vision Studio.
