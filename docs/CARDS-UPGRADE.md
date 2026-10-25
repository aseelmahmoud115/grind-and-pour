# Grind & Pour: Fixes + "Brew Reveal" card interaction

Implement every section, then verify (section 6). Keep the existing design tokens, fonts and tone.

## 1. Remove the loading bar

- Remove the thin terracotta preload progress line under the navbar entirely (component, state, and styles).
  Frames keep preloading silently in the background. Keep the intro overlay only if it's already there and quick
  (≤ 1.5 s). If in doubt, remove it too. The hero poster image covers the first paint.

## 2. Hero text hidden behind the navbar

- The eyebrow "01 — GRIND" currently sits behind the "Grind & Pour" wordmark pill. All scene copy (every scene, every
  breakpoint) must start **below** the navbar: top padding = navbar height + 24px. Use a CSS variable `--nav-h`
  measured once with ResizeObserver, so it stays correct at every size.
- On short viewports (height < 760px), scale the display words down by height (`min(14vw, 17vh)`) so the body text and
  buttons still fit above the fold without overlapping the subject.
- Also check the step-indicator labels and callouts never sit under the navbar.

## 3. Product carousel: arrows only, everywhere

- **Remove the dot indicators** under the cards.
- **Prev/next arrow buttons on all screen sizes** (mobile included), placed on the carousel's top right, next to the section title
  (or under the cards, centred, on < 640px). They are round, 44×44px min, espresso outline with an espresso fill on hover, and disabled
  (40% opacity, `aria-disabled`) at the ends. Each one scrolls by exactly one card with smooth scrolling.
- Keyboard: Left/Right still move one card when the carousel has focus.
- The same carousel component is used for "Related products"; apply the same changes there.

## 4. Vertical scrolling over the cards is blocked

Scrolling the page up/down while the pointer or finger is over the cards doesn't work, which traps users on small screens. Fix the root cause:
- Remove `data-lenis-prevent` (or Lenis `prevent`) from the carousel. Instead, let Lenis handle vertical wheel input everywhere
  and only let the carousel take **horizontal** intent: in the carousel's wheel handler, if `|deltaX| > |deltaY|` (or Shift is held),
  scroll the carousel and `stopPropagation`. Otherwise do nothing, so the page scrolls. If the installed Lenis version supports
  `allowNestedScroll`, use it.
- Touch: set `touch-action: pan-x pan-y` on the scroller, so a vertical swipe scrolls the page and a horizontal swipe scrolls the carousel.
  Check that no parent sets `touch-action: none` or `overscroll-behavior` that blocks this.
- Make sure no decorative layer (background shapes, gradient fades, the cup centrepiece, shadows) sits on top of the cards
  capturing events. Decorative elements get `pointer-events: none`.
- Verify on a 375px viewport with Playwright's touchscreen: a vertical swipe starting on a card moves the page, and a horizontal swipe moves the carousel.

## 5. "Brew Reveal": product card hover / touch interaction

Replace the plain image scale-up. When the user hovers the product image (pointer devices) or the card becomes the active,
snapped card (touch devices), the bag gives way to **that coffee served in a real cup**, with smooth, premium motion.

### Assets
- Per product: `public/images/products/<slug>/cup.webp` (3:4, cream background, same framing as the bag photos). They'll be added soon.
- Until a product's `cup.webp` exists, fall back to `/images/cup.webp`, centred and cropped to 3:4. Detect it at build time
  the same way as the bag images. Add `cupImage` to the product data.

### Choreography (Motion springs; transform/opacity/clip-path only)
1. **3D tilt (always on while hovering):** the image wrapper follows the cursor with `rotateX/rotateY` up to ±6°, `perspective: 900px`,
   spring `{ stiffness: 200, damping: 20 }`, and a soft moving highlight (a radial-gradient sheen at the cursor position, 8% opacity).
2. **Circle wipe reveal (~650 ms):** the cup photo is revealed by `clip-path: circle()` expanding **from the cursor's entry point**
   (touch: from the centre) from 0% to 150%, with an ease-out curve `[0.22, 1, 0.36, 1]`. At the same time, the bag photo scales 1 → 0.92 and drifts
   up 12px and fades to 0.
3. **Steam:** after the wipe, three thin cream SVG steam wisps rise above the cup (path `pathLength` 0→1 + y −20px + fade). They are staggered
   by 180 ms and loop gently while it stays revealed. Position them over the cup's rim (expose a `steamAt` `{x,y}` per product, as %;
   default `{50, 38}`).
4. **Tasting notes:** the product's notes pop in as small cream pills around the image (e.g. "jasmine", "lemon", "honey").
   They are staggered by 70 ms, with scale 0.8 → 1 + fade, and each floats very slightly (±3px y loop).
5. **Accent glow:** a soft radial glow in the product's accent colour fades in behind the cup (12–15% opacity).
6. **Exit:** everything reverses smoothly (the wipe collapses toward the exit point), ~450 ms. A quick back-and-forth must never
   jump: use springs/interruptible animations.

### Behaviour details
- Pointer devices: triggered by hovering the image area. Keyboard: triggered on `:focus-visible` of the card link (from the centre).
- Touch devices: the snapped/centred card reveals automatically 350 ms after the scroll settles, and resets when it leaves.
  Tapping the image still opens the product page.
- `prefers-reduced-motion`: a simple 200 ms crossfade bag → cup, with no tilt, steam or wipe.
- Performance: only the hovered/active card animates. Preload a product's `cup.webp` when its card enters the viewport,
  so the reveal never shows an empty frame.
- Use the same reveal on the `/shop` grid cards. On the product page, add a "Bag / In the cup" toggle in the gallery
  that uses the same circle wipe.

## 6. Also

- Fix the Next.js dev overlay "1 Issue" shown in the corner (read it, fix the cause).

## 7. Verify

- `npm run build` and `npm run lint` pass. The e2e tests still pass. Add tests for: vertical swipe over the cards scrolls the page
  (375px); the arrow buttons reach the last card; no dots are rendered; the hero eyebrow's bounding box doesn't intersect the navbar's
  at 1366×768, 1440×900, 768×1024 and 375×812.
- Manually check the reveal at 60 fps in Chrome DevTools (Performance panel, no long tasks while hovering).
- Summarise what changed.
