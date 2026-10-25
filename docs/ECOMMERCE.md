# Grind & Pour: Turn the site into a working (demo) e-commerce store

Keep the cinematic scroll film on the home page exactly as it is. Add a real shopping flow around it:
shop, product pages, cart, checkout with a **demo** payment, an order confirmation, and a full store footer.
Payments are simulated. No money moves, no real card data is collected or sent anywhere.

Use the `ui-ux-pro-max` skill for e-commerce UX patterns (product page, cart, checkout, forms) and run its checklist at the end.
Keep the existing design tokens, fonts and tone. Nothing should look like a different site.

---

## 1. Fix first: product cards on small/medium screens

On screens below `lg` (1024px), the "Find your cup" cards are cut off and can't be reached.
- Below `lg`: make the cards a horizontal **scroll-snap carousel**: `overflow-x: auto`, `scroll-snap-type: x mandatory`,
  each card `scroll-snap-align: start` and about 80% of the viewport width (on `md`, about 45%), so the next card "peeks" in.
- Hide the scrollbar visually but keep the carousel scrollable by touch, trackpad and mouse wheel (shift + wheel), and by keyboard
  (it is a focusable region with `aria-label="Products"`; Left/Right arrows move one card).
- On `md`: add round prev/next arrow buttons that scroll by one card and are disabled at the ends.
  Show small dots under the carousel that reflect the active card.
- Lenis must not swallow horizontal scrolling inside the carousel (`data-lenis-prevent` on the scroller, or Lenis' `prevent` option).
- Reuse this same carousel component for "Related products" on product pages.

## 2. Tech additions

- State: `zustand` with `persist` (localStorage) for the cart and past demo orders.
- Forms: `react-hook-form` + `zod`.
- Icons: `lucide-react`.
- Don't add a backend or database. Everything is static/client-side, so the site can be deployed to Vercel as-is.

## 3. Product data: `src/data/products.ts`

**The store sells coffee only**: different coffees, no equipment. The cup image stays as the decorative centerpiece of
"Find your cup" on the home page, but it is not a product.

A typed catalog. All prices are in USD.

```ts
type Product = {
  slug: string;
  name: string;
  roast: "light" | "medium" | "dark";
  style: "single-origin" | "blend" | "arabic-turkish" | "decaf";
  price: number;                        // base price (250 g)
  variants: { id: string; label: string; priceDelta: number }[]; // size
  grindOptions: string[];
  images: string[];                     // first = card image; missing files are skipped gracefully
  short: string;                        // 1 line for cards
  description: string;                  // 2–3 sentences
  details: { label: string; value: string }[]; // origin, region, process, altitude, roast, tasting notes, best for
  accent: string;                       // label color of the bag, used for small UI accents (dot, badge)
  stock: number;                        // demo; 0 shows "Sold out"
};
```

Products (images live in `public/images/products/<slug>/1.webp`, `2.webp`, …):

| slug | name | origin · process · roast | notes | style | price | accent | image now |
|---|---|---|---|---|---|---|---|
| sage-morning | Sage Morning | Ethiopia Yirgacheffe · washed · light | jasmine, lemon, honey | single-origin | 18 | sage `#93A88A` | `bag-sage.webp` |
| terracotta-hearth | Terracotta Hearth | Colombia Huila · washed · medium | caramel, cocoa, red apple | single-origin | 16 | terracotta `#B4572F` | `bag-terracotta.webp` |
| sky-drift | Sky Drift | Kenya AA, Nyeri · washed · light-medium | blackcurrant, grapefruit | single-origin | 19 | sky `#A7C4E2` | `bag-blue.webp` |
| midnight-roast | Midnight Roast | Brazil Cerrado · natural · dark | dark chocolate, molasses, toasted nut | single-origin | 15 | black `#1E1A17` | none yet |
| golden-hour | Golden Hour | Guatemala Huehuetenango · washed · medium | brown sugar, orange, almond | single-origin | 17 | mustard `#D3A23F` | none yet |
| haraz-mocha | Haraz Mocha | Yemen, Haraz mountains · natural · medium | dried fig, raisin, warm spice | single-origin | 26 | dusty rose `#C98B8B` | none yet |
| cardamom-qahwa | Cardamom Qahwa | Arabic coffee blend, light roast with green cardamom (pre-ground) | cardamom, honey, light & fragrant | arabic-turkish | 14 | olive `#7E8B4E` | none yet |
| turkish-gold | Turkish Gold | Brazil & Ethiopia blend · medium-dark · extra-fine Turkish grind | cocoa, roasted hazelnut, thick foam | arabic-turkish | 13 | copper `#A8643A` | none yet |
| velvet-shot | Velvet Shot Espresso | Brazil, Colombia & Ethiopia blend · medium-dark | milk chocolate, cherry, syrupy | blend | 17 | burgundy `#7A2E3A` | none yet |
| night-owl-decaf | Night Owl Decaf | Colombia · Swiss Water decaf · medium | cocoa, caramel, soft | decaf | 16 | navy `#2F3E5C` | none yet |

- Move the existing images: `bag-sage.webp` → `sage-morning/1.webp`, `bag-terracotta.webp` → `terracotta-hearth/1.webp`,
  `bag-blue.webp` → `sky-drift/1.webp`. Keep `cup.webp` where it is for the home section.
- Variants for every coffee: `250 g` (+0), `500 g` (+14), `1 kg` (+26).
- Grind options: `Whole bean`, `Pour-over`, `French press`, `Espresso`, `Turkish (extra fine)`.
  - `cardamom-qahwa` comes pre-ground only: `Arabic coffee grind`.
  - `turkish-gold` is fixed to `Turkish (extra fine)`. Hide the select when there is only one option.
- Write natural, appetising descriptions and a "Best for" detail (e.g. V60, espresso, cezve/ibrik, dallah).
- **Products without an image yet** are hidden from the shop, home and related lists (`images.length === 0` or the files are
  missing at build time; check with `fs.existsSync` in a build-time helper). When the image files are added later,
  they appear automatically. Document this in the README.
- Don't invent customer reviews or star ratings anywhere.

## 4. Pages and routes (App Router)

- `/` (home): keep the film. "Find your cup" cards now link to their product page, and the "+" button really adds the
  default variant to the cart (and opens the cart drawer). Add a "Shop all" link under the cards.
- `/shop`: a grid of all coffees. It has filter chips for **Roast** (All / Light / Medium / Dark) and **Style**
  (Single origin / Blends / Arabic & Turkish / Decaf), which can be combined and are reflected in the URL query
  (e.g. `/shop?roast=light&style=single-origin`). It also has sort (Featured, Price ↑, Price ↓) and an empty state with a "Clear filters" button.
  It's responsive: 2 columns on mobile, 3 on tablet, 4 on desktop.
- `/product/[slug]`: `generateStaticParams` + per-product `generateMetadata`.
  - Image gallery (main image + thumbnails if there is more than one image; swipe on mobile).
  - Name, price (updates with variant), short text, variant pills, grind select (coffee), quantity stepper (1–10, capped by stock).
  - "Add to cart" (primary) + "Buy now" (adds the item and goes to checkout).
  - Accordions: Details, Brewing tips (pour-over coffees link back to the home film steps; Arabic & Turkish coffees get
    their own short cezve/dallah method), Shipping & returns.
  - Related products carousel (same roast or style first).
  - Sticky add-to-cart bar on mobile once the main button scrolls out of view.
- Cart drawer: slides in from the right when the navbar cart icon is clicked or an item is added. It has line items
  (image, name, variant/grind, qty stepper, remove), a subtotal, a "free shipping over $40" progress bar, "View cart" and "Checkout".
  It traps focus, closes on Esc, and has an `aria-live` announcement on add.
- `/cart`: the full cart page with the same controls, plus a promo code field (`WELCOME10` = 10% off, the only valid code) and an order summary.
- `/checkout`: a 3-step flow on one page with a step indicator, with an order summary sidebar (collapsible on mobile):
  1. **Contact & shipping**: email, full name, phone, country (Egypt, Palestine, Jordan, Saudi Arabia, UAE, other),
     city, address, postal code (optional). Validate with zod and show inline errors next to fields.
  2. **Delivery**: Standard $5 (3–5 days) / Express $12 (1–2 days). Standard is free when the subtotal is $40 or more.
  3. **Payment (demo)**:
     - A clear banner at the top of this step: "Demo store: no real payment is taken. Use test card 4242 4242 4242 4242,
       any future expiry date and any 3-digit CVC."
     - Options: Card (demo) or Cash on delivery.
     - The card form has number (auto-spaced), name on card, expiry MM/YY, and CVC.
     - **Accept only the test number `4242 4242 4242 4242`.** Any other number shows: "This is a demo store: please use
       the test card 4242 4242 4242 4242." Card fields are never stored, logged, or sent anywhere. Clear them on submit.
       Use `autocomplete="off"` on the card fields so browsers don't offer saved real cards.
     - "Place order" shows a ~1.5 s processing state, then creates the order.
- `/order/[id]`: the confirmation page: order number (e.g. `GP-` + 6 chars), items, totals, shipping address, delivery estimate,
  and "Continue shopping". The order is saved to localStorage (zustand), and the cart is cleared.
- `/orders`: a simple list of past demo orders on this device (linked from the footer).
- Info pages (short and real-sounding, but clearly a demo brand): `/shipping`, `/returns`, `/faq`
  (6–8 questions with an accordion), `/contact` (a form that validates and shows a success message, sending nothing), `/about`.
- `not-found.tsx` styled to the brand.

## 5. Navbar

- Wordmark → `/`. Links: `Shop`, `Single origin`, `Arabic & Turkish`, `Brew guide` (→ `/#grind`). Cart button with a count badge (an animated bump when it changes).
- On non-home pages, the navbar has a solid cream background (the transparent version is only over the film).
- Mobile: a menu button opens a full-height sheet with the same links.

## 6. Footer (store-style)

Dark espresso background, the cream text and spacing already in use. Layout from top to bottom:

1. **Newsletter band**: "Fresh roasts, brew tips, and first dibs on new beans." An email field + "Subscribe". The form validates the email
   and shows "You're on the list ☕" (client-side only, nothing is sent).
2. **Link columns** (4 columns on desktop, 2 on tablet, accordions on mobile):
   - **Shop**: All coffee, Light roasts, Dark roasts, Arabic & Turkish, Decaf, Gift cards (→ shop, "coming soon" badge)
   - **Help**: Shipping & delivery, Returns & refunds, FAQ, Track my order (→ `/orders`), Contact us
   - **About**: Our story, Brew guide (→ `/#grind`), Brew ratios (→ `/#ratios`)
   - **Contact**: hello@grindandpour.demo (displayed as text, not a working inbox), Cairo, Egypt, Sun–Thu 10:00–18:00
3. **Trust row**: three small items with icons: "Roasted to order", "Free shipping over $40", "Secure checkout (demo)".
4. **Bottom bar**: `© 2026 Grind & Pour` · Privacy · Terms (simple pages) · a small row of generic payment icons
   (lucide `CreditCard`, `Banknote`, and the text "Cash on delivery"). Don't use real brand logos.
   On the right: "Demo project by **Aseel Alqedra**", with GitHub `github.com/aseelmahmoud115`.
   Then the small line "Visuals generated with AI. Layout inspired by a concept by Cool Vision Studio."
5. Social icons (Instagram, Facebook, TikTok, YouTube), pointing to `#`, each with an `aria-label`.

## 7. Quality bar

- Prices formatted with `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`. Totals are computed in cents to avoid float errors.
- Every interactive element is keyboard-reachable with a visible focus ring. Form errors are announced (`aria-describedby`, `aria-invalid`).
- No layout shift when the cart badge or drawer updates. Images use `next/image` with proper sizes.
- `npm run build` and `npm run lint` must pass.
- **Playwright end-to-end tests** (in `e2e/`):
  1. On a 375px viewport, the home product carousel can be scrolled to the last card.
  2. Add from the home "+" → the drawer opens → change qty → go to checkout.
  3. Complete checkout with the test card → the confirmation page shows the right total; the cart is empty.
  4. A non-test card number shows the demo message and does not place an order.
  5. Cash on delivery places an order.
  6. The promo code `WELCOME10` applies 10% off.
- Check widths 375 / 768 / 1024 / 1440 and `prefers-reduced-motion`.
- Finish with a short summary of the routes and what to do to add new product images.
