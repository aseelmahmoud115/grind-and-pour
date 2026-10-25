# Grind & Pour: Footer update + living steam

Implement everything below, then verify (section 3) and commit to git with clear messages.

## 1. Footer

1. **Remove** the bottom credit block entirely: the line "Demo project by Aseel Alqedra · github.com/aseelmahmoud115"
   and the line "Visuals generated with AI. Layout inspired by a concept by Cool Vision Studio."
   Move that credit into the project `README.md` under a "Credits" heading instead.
2. **Contact column**: replace its content with exactly:
   - Email: `aseel.alqedra2004@gmail.com` as a real `mailto:` link
   - Website: `aseel-alqedra.vercel.app` linking to `https://aseel-alqedra.vercel.app` (`target="_blank" rel="noopener noreferrer"`)
   - Remove "Cairo, Egypt", the opening hours, and the "Demo brand: this inbox isn't monitored" note.
   Also replace `hello@grindandpour.demo` everywhere else in the project (contact page, FAQ, policies, metadata) with the same real email.
3. **Newsletter form**: on screens ≥ 640px, the email input and the Subscribe button sit **side by side on one row**,
   vertically centered, with a 12px gap (not touching). Both are exactly 48px tall. The input grows (`flex: 1`, max-width ~420px)
   and the button keeps its natural width. Below 640px they stack, with the button full-width. Keep the validation and success message.
4. **Social icons** (bottom row): replace Instagram and TikTok. The final set, in this order:
   - LinkedIn → `https://www.linkedin.com/in/aseel-al-qedra`
   - GitHub → `https://github.com/aseelmahmoud115`
   - Facebook → `#` (placeholder for now)
   - YouTube → `#` (placeholder for now)
   Use the proper brand glyphs via `simple-icons` (or `react-icons/si`), monochrome, in the cream colour, at the same size as now.
   Each icon is a link with an `aria-label` ("LinkedIn", "GitHub", …). Real links open in a new tab. Keep the placeholders in one
   config object (`src/data/site.ts`) so they're easy to fill in later.

## 2. Living steam on the cup reveal

The cup photos already have a frozen wisp of steam. When a card switches to the cup, the steam must look **alive and continuous**,
like real steam rising from a hot drink, for as long as the cup is shown, and fade out when the card returns to the bag.

Replace the current steam shimmer/wisps with a **canvas particle steam** layer:
- One `<canvas>` per card, positioned over the image and sized to the image area (DPR capped at 1.5). It's created/started only while
  that card is revealed, then stopped and cleared after the exit fade (no rAF running for hidden cards).
- **Emitter**: a short horizontal line at the cup's rim (`steamAt` from products.ts, plus a `rimWidth` % per product; default 18% of the image width).
  Check each `cup.webp` and set `steamAt`/`rimWidth` so the steam starts exactly from the liquid surface.
- **Particles**: spawn ~10–14 per second. Each one is a soft radial gradient blob (warm white `rgba(255,250,240,a)`) that:
  - rises 60–110 px over its life (life 2.4–3.6 s), slowing slightly as it rises
  - grows from ~10 px to ~55 px radius
  - drifts sideways with smooth **noise-based turbulence** (2D simplex/curl noise sampled by position + time, so the plume curls and
    sways like real steam instead of moving straight up)
  - fades in quickly (first 15% of life) to a max alpha of 0.10–0.16, then fades out slowly
  - Draw with `globalCompositeOperation = "lighter"` or `"screen"`, so overlapping blobs build up a soft column.
- **Mask**: fade the whole layer out toward its top with a vertical gradient mask, so steam dissolves naturally before the card edge.
- **Lifecycle**: when the reveal starts, the emitter starts after the circle wipe is ~60% done, ramping its spawn rate up over 600 ms.
  When the card returns to the bag, spawning stops immediately, existing particles finish their lives, and the canvas fades with the cup.
  It never cuts off abruptly.
- Very light **heat shimmer** (optional, only if it stays at 60 fps): an SVG `feTurbulence` + `feDisplacementMap` filter with a tiny scale (2–3)
  applied to a small band just above the rim.
- `prefers-reduced-motion`: no particles. Show the static photo steam only.
- Use the same steam on the `/shop` cards and on the product page "In the cup" view.

## 3. Verify

- `npm run build` and `npm run lint` pass. The e2e tests pass (update any footer/contact assertions).
- At 1440 px, the newsletter input and button are on one row with a visible gap. At 375 px, they stack.
- No `grindandpour.demo` string remains in the codebase (`grep`).
- Steam: hover a card for 10+ seconds. The plume keeps rising and swaying continuously with no visible loop point or repeated pattern,
  and when you leave, it fades out gracefully. While hovering, the frame time stays ≤ 16.7 ms (scripted check in headless Chrome, as before).
  When no card is revealed, no steam rAF loop is running.
- Commit with clear messages.
