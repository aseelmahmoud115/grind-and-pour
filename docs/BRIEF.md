# Grind & Pour — Build Brief

A cinematic, scroll-driven one-page website that teaches how to brew pour-over coffee, step by step.
As you scroll, pre-rendered 3D-style clips play frame by frame: beans fall into a grinder, the grinder
comes apart, water is poured, and coffee flows. The page ends with a small "Find your cup" product section.

Style reference: a coffee landing-page concept ("POUR / PLAY" by Cool Vision Studio). It uses a warm cream
background, huge retro display type, and one full-screen product moment per scroll step.
Match that *feel*. Do not copy their name or logo.

---

## 0. Setup (do this first)

1. Create a new Next.js app in a folder named `coffee-site` next to this `coffee-site-assets` folder
   (i.e. `C:\Users\j\OneDrive\Desktop\coffee-site`). Use: TypeScript, App Router, Tailwind CSS, ESLint, `src/` dir.
2. Install `motion` (the library formerly called Framer Motion). Import it from `motion/react`.
3. Extract `coffee-site-assets/grind-and-pour-assets.zip` into `coffee-site/public/`. The result must be:
   ```
   public/frames/1-grind/0001.webp … 0192.webp
   public/frames/2-exploded/0001.webp … 0192.webp
   public/frames/3-pour/0001.webp … 0192.webp
   public/frames/4-sip/0001.webp … 0192.webp
   public/images/cup.webp, bag-sage.webp, bag-terracotta.webp, bag-blue.webp, hero-poster.webp
   ```
   On Windows: `tar -xf ..\coffee-site-assets\grind-and-pour-assets.zip -C public`
4. **Use the `ui-ux-pro-max` skill** to check the design system (palette, type pairing, spacing, a11y) before
   writing components. Then run its pre-delivery checklist at the end.
5. Optional: if 21st.dev has a fitting navbar or product-card component, add it with its
   `npx shadcn@latest add "https://21st.dev/r/..."` command and restyle it to the tokens below.
   If shadcn isn't set up yet, run `npx shadcn@latest init` first. Skip this step if nothing fits well.

## 1. Assets facts

- Every frame is **1248×704 WebP** at 24 fps. Each clip has **192 frames** (8 s). The total is about 19 MB.
- Frames have a warm cream studio background with a soft vignette. Their edges are **not** a flat color,
  so scenes must be **full-bleed** (draw the canvas "cover"-style). Don't try to blend frame edges into the page.
- Main subject position in each clip (x as a fraction of frame width). Use it as the "cover" focal point
  so the subject stays visible on narrow/mobile screens:
  | clip | subject | focal x | notes |
  |---|---|---|---|
  | 1-grind | grinder | 0.69 | empty space on the left for text; beans pile up on the table |
  | 2-exploded | exploded grinder | 0.50 | parts stacked vertically, top part slightly cropped |
  | 3-pour | kettle + dripper + server | 0.57 | kettle enters from top right |
  | 4-sip | coffee wave + dripper | 0.50 | wave fills lower 2/3 of frame |
- Product images (cream background, 3:4): `bag-sage`, `bag-terracotta`, `bag-blue`. The cup image is square (1:1).

## 2. Design tokens

```
--cream:        #EAD8BF   page background (sampled from the frames)
--cream-light:  #F4EADB   cards, surfaces
--espresso:     #2A1A12   primary text, dark buttons
--roast:        #6B4A35   secondary text
--terracotta:   #B4572F   accent, big display words (like the reference)
--sage:         #93A88A   product accent
--sky:          #A7C4E2   product accent
```
- Display font: **Fraunces** (variable, use the `SOFT`, `WONK` and `opsz` axes). Set it heavy (800–900) with
  `SOFT 100` for the retro, chunky look of the reference. Body font: **DM Sans**. Load both via `next/font/google`.
- The display words are huge: `clamp(5rem, 16vw, 15rem)`, tight leading (0.85), and slightly negative tracking.
- Small UI text uses uppercase, letter-spacing 0.12em, 12–13px.
- Use rounded-full pill buttons. The primary button is espresso with cream text, paired with a circular outline arrow button.
- Contrast: all body text must reach 4.5:1 against the part of the frame behind it. Where needed, add a soft
  cream gradient scrim behind the text column (left side), not a box.

## 3. Page structure

### Navbar (fixed, transparent over the scenes)
- Left: wordmark **"Grind & Pour"** (Fraunces, 600).
- Center/right links: `Method`, `Ratios`, `Beans`. Each is an anchor link to a section.
- Right: a cart icon (decorative, with an aria-label). No login or sign-up buttons.
- On mobile: the links collapse into a menu button.

### Scene A — GRIND (hero) + DIAL IN (one sticky canvas, two clips)
Section height ≈ `500vh`, with a sticky full-viewport `<canvas>`.
- Progress 0 → 0.5 plays `1-grind` (frames 1→192). Progress 0.5 → 1 plays `2-exploded` (frames 1→192).
- At the boundary, **crossfade** over about 6% of progress. Draw the last frames of clip 1 and the first frames
  of clip 2 together using `globalAlpha`, because the two clips don't start from an identical pose.
- Text for the first half (left column, vertically centered):
  - eyebrow: `01 — GRIND`
  - display: **GRIND** in espresso, plus **& POUR** in terracotta. Together they read "GRIND & POUR".
    The second word can sit partly behind the grinder for depth if it looks good. Otherwise put it on its own line.
  - body: "Start with 15 g of freshly roasted whole beans. Grind them medium-fine, like coarse sea salt, right before you brew."
  - buttons: `Start brewing` (scrolls to the next step) + a circular ↓ arrow button
- Text for the second half (cross-fades in):
  - eyebrow: `02 — DIAL IN`
  - display: **DIAL IN**
  - body: "Steel burrs crush the beans evenly, so every particle extracts at the same pace. Go finer for a stronger,
    heavier cup; go coarser for a brighter, lighter one."
  - Callout labels appear one by one next to the floating parts: `Hopper`, `Burr set`, `Motor`, `Grounds`.
    Each is a thin line plus a small uppercase label. **Look at `public/frames/2-exploded/0096.webp` and
    `0192.webp` to place them accurately**, using positions in frame-space converted through the same cover math as the canvas.
    Hide the callouts below 768px.

### Scene B — POUR
Section ≈ `300vh`, with a sticky canvas playing `3-pour`.
- eyebrow `03 — BLOOM & POUR`, display **POUR**
- body: "Heat water to 92–96 °C. Pour 30 g first and let the coffee bloom for 30–40 seconds. Then pour slowly
  in small spirals until you reach 250 g."
- 4 stat chips that animate in with a stagger: `15 g coffee` · `250 g water` · `1 : 16 ratio` · `93 °C`

### Scene C — SIP
Section ≈ `250vh`, with a sticky canvas playing `4-sip`.
- eyebrow `04 — SIP`, display **SIP** (cream text with a subtle espresso shadow if it sits over the wave;
  otherwise espresso text placed top-left)
- body: "Total brew time: 2:30 to 3:30. Swirl the server, let it cool for a minute, and taste.
  Too bitter? Grind coarser. Too sour? Grind finer."

### Ratios (short static band, id="ratios")
A cream-light band with a simple 3-column cheat sheet (1 cup / 2 cups / 3 cups → coffee g / water g),
using the 1:16 ratio: 15/250, 30/500, 45/750. Use Fraunces for the numbers.

### Find your cup (id="beans")
Mirrors the reference's final section: the **cup** sits centered and large, and three **bag cards** float around it
(on desktop: two on the left, one on the right, or a staggered row; on mobile: the cup on top, then a horizontal scroll-snap row of cards).
- display: **FIND YOUR CUP** (stacked, centered)
- Cards (cream-light, rounded-3xl, soft shadow; image, name, origin, notes, roast, price, and a round "+" button):
  - `bag-sage` — **Sage Morning** · Ethiopia Yirgacheffe · jasmine, lemon, honey · light · $18
  - `bag-terracotta` — **Terracotta Hearth** · Colombia Huila · caramel, cocoa, red apple · medium · $16
  - `bag-blue` — **Sky Drift** · Kenya AA · blackcurrant, grapefruit · light-medium · $19
- Cards enter on scroll with a slight upward float and stagger. On hover: lift 4px and the image scales to 1.03.
- This is a demo, so the "+" buttons only show a small "Added" toast. There is no real cart.

### Footer
Wordmark, the 4 steps as links, and a small line: "Demo project by Aseel Alqedra. Visuals generated with AI.
Layout inspired by a concept by Cool Vision Studio." Add a link to `github.com/aseelmahmoud115`.

### Step progress indicator
A fixed vertical indicator on the right edge (desktop only) with 01–04 dots/labels. It highlights the current scene,
and clicking a dot scrolls to that scene. Hide it in the products and footer sections.

## 4. Scroll-frame engine (the important part)

Build one reusable client component, e.g. `<FrameScroller clips={[...]} heightVh={...} focalX={...} />`:
- Use a `<canvas>` sized to the viewport × `devicePixelRatio` (cap DPR at 2). Redraw on resize.
- Use `useScroll({ target: sectionRef, offset: ["start start", "end end"] })` from `motion/react` to get the progress.
  Map it to a frame index with `useTransform`, and draw in a `requestAnimationFrame` loop, only when the index changes.
- **"Cover" drawing with a focal point**: scale = max(cw/iw, ch/ih). Offset x so `focalX * iw * scale`
  lands as close to the canvas center as possible without exposing an edge. Do the same for y, centered.
- **Preloading**:
  - Scene A's first 24 frames load immediately, and frame 1 is drawn as soon as it's ready.
  - The rest of Scene A loads right after first paint.
  - Scenes B and C start loading when their section is within 1 viewport (IntersectionObserver, `rootMargin: "100% 0px"`).
  - Use `new Image()` + `decode()`, and keep the decoded images in an array.
  - If the target frame isn't loaded yet, draw the nearest loaded frame. Never draw a blank canvas.
- Show `hero-poster.webp` as a CSS background on Scene A's sticky container, so something shows before JS runs.
- Show a minimal loading indicator (thin terracotta progress line under the navbar) while Scene A preloads.
- **`prefers-reduced-motion: reduce`**: don't scrub. Show one still frame per scene (frame 192 for A's first half and
  frame 96 for the others), make the sections only ~120vh, and keep text fades to a simple opacity change.
- Text animations use Motion: fade + 24px rise, driven by the same scroll progress (`useTransform`) so they stay in
  sync with the frames. Use ease-out, 300–500 ms equivalents. Animate only `opacity` and `transform`.

## 5. Quality bar

- Responsive at 375, 768, 1024, 1440 and 1920 widths. No horizontal scroll. Text never sits on top of the main subject.
  On mobile, move the text column to the bottom over a cream gradient scrim.
- Semantic HTML: one `<h1>` ("Grind & Pour" visually expressed by the hero), `<h2>` per scene, `<nav>`, `<main>`, `<footer>`.
  Canvases get `aria-hidden="true"`. Each scene has a visually hidden description of what the animation shows.
- Keyboard: visible focus rings in terracotta, and the menu button is operable by keyboard.
- Lighthouse: aim for Accessibility ≥ 95 and Best Practices ≥ 95. Don't lazy-load the hero poster.
- `npm run build` must pass with no TypeScript or ESLint errors.
- Add page `metadata` (title "Grind & Pour — How to brew pour-over coffee", plus a description).
- When done, run the dev server, scroll through the whole page, and check each scene, the crossfade, the callouts,
  mobile layout and reduced motion. Fix anything that looks off before finishing.

## 6. Later (not now)

- An Arabic (RTL) version.
- Replacing `2-exploded` with a regenerated clip that starts from the last frame of `1-grind`.
  The file names and frame count will stay the same, so it should be a drop-in replacement.
