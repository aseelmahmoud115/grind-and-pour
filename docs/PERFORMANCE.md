# Grind & Pour: performance fix for the film

The live site feels slow and heavy, scrolling through the film stutters on phones, and sometimes the first clip (grind)
shows during steps 2–4. I reviewed `Film.tsx`, `lib/frames.ts` and `lib/timeline.ts`. These are the causes:

1. **Wrong clip on screen.** Preloading is strictly sequential: all 192 frames of clip 1 load before clip 2 starts.
   If the user scrolls ahead, `nearestLoaded` finds nothing for clips 2–4, every layer `continue`s, `drew` stays false,
   and the canvas keeps the last frame of clip 1.
2. **Heavy download.** All 768 frames (~19 MB) start downloading on page load. Vercel serves `/public` with
   `max-age=0, must-revalidate`, so repeat visits revalidate every frame.
3. **Huge memory use.** Every frame is `decode()`d and kept alive: 768 × 1248 × 704 × 4 bytes ≈ **2.7 GB** of decoded
   bitmaps if the browser honours it. Phones throttle, evict and re-decode, which is the mobile scroll jank.
4. **Draw cost on phones.** Up to four full-screen `drawImage` calls per tick (crossfade × sub-frame blend) on a
   1.25-DPR canvas, while the phone only shows ~30% of each frame's width.

New, lighter frame sets are ready in `..\coffee-perf\frames-v2.zip` (made from the clean source clips):
- `desktop/<clip>/0001–0120.webp`: 1248 × 704, **120 frames per clip (15 fps)**, ~10.6 MB total
- `mobile/<clip>/0001–0120.webp`: **512 × 704 crops centred on each clip's subject**, ~7 MB total
  (focal point is 0.5 in every mobile clip)

Implement everything below, then verify (section 7) and commit.

## 1. Assets and caching

- Extract the zip into `public/frames/v2/`, so the paths are `public/frames/v2/desktop/1-grind/0001.webp` etc.
  Delete the old `public/frames/1-grind … 4-sip` folders. Regenerate `hero-poster.webp` from
  `v2/desktop/1-grind/0001.webp` (same name/path as now).
- `FRAME_COUNT = 120`. Frame size and focal point now come from the active set:
  desktop 1248 × 704 with the existing `focalX` per clip; mobile 512 × 704 with `focalX = 0.5` for all clips.
  `coverRect`/`clipRect` must take the set's frame size.
- In `next.config.ts`, add `headers()`:
  - `/frames/:path*` → `Cache-Control: public, max-age=31536000, immutable` (the `v2` folder name is the cache-buster; any future
    frame change goes to `v3`)
  - `/images/:path*` → `Cache-Control: public, max-age=604800, stale-while-revalidate=86400`

## 2. Pick a frame set

- Use the mobile set when `matchMedia("(max-width: 767px) and (orientation: portrait)")` matches. Otherwise use desktop.
  If it changes (rotation), switch sets: drop the old caches and reload by priority.
- **Save-data / slow networks**: if `navigator.connection?.saveData` is true or `effectiveType` is `2g`/`slow-2g`/`3g`,
  use the still-frame mode the reduced-motion path already has (one frame per clip, short sections, plain fades).

## 3. Loader: fetch compressed, decode a sliding window

Replace the "decode everything" approach:
- **Network layer**: fetch frames as `Blob`s (compressed, small in memory) through a priority queue. Concurrency is 4 on desktop
  and 3 on mobile. Background requests use `priority: "low"`.
- **Load order**:
  1. Wave 0: frame 0001 of all four clips (four images), so every clip always has something correct to show.
  2. Wave 1: every 8th frame of all four clips (60 images), starting with the clip at the current scroll position.
  3. Then fill the clip at the current position, then the next clip, then the rest.
  On every scroll, re-sort the pending queue by distance from the current timeline position (ahead of the scroll direction first).
  Don't start anything until after the first paint (`requestIdleCallback` with a `setTimeout` fallback).
- **Decode layer**: keep a sliding window of decoded `ImageBitmap`s (`createImageBitmap(blob)`, which decodes off the main thread)
  around the displayed position: ~16 frames behind and ~32 ahead in the scroll direction, across clip boundaries during crossfades.
  The cap is **48 bitmaps on desktop and 28 on mobile**. `close()` anything evicted.
- **Drawing never mixes clips**: a layer for clip *i* only ever draws frames of clip *i*. If the exact frame isn't decoded,
  draw the nearest decoded frame **of the same clip**. If none is decoded, draw the clip's wave-0 frame (always kept decoded,
  outside the cap). Remove the `if (!drew) return` path that leaves a stale frame from another clip on screen.

## 4. Draw less

- **Mobile**: no sub-frame blending (one `drawImage` per layer; only a crossfade draws two). DPR cap is 1.0.
  `imageSmoothingQuality = "medium"`. The camera push stays (it's only rect maths).
- **Desktop**: keep the sub-frame blend and DPR cap 1.25.
- Skip the draw entirely when the resolved (clip, frame index, alpha, rect) for every layer is unchanged since the last draw.
- Retune for 120 frames: `MAX_FRAMES_PER_TICK`, `FAST_TRAVEL_*` and `LAG_*` are in frames, so scale them by 120/192.
  On mobile, raise `SMOOTHING` to 0.35 so the film follows the finger closely.

## 5. Lighter page

- Lazy-load what the hero doesn't need: `SteamCanvas`, the Brew Reveal code, the cart drawer and the checkout schemas via
  `next/dynamic` / dynamic `import()` when first needed.
- Product images use `next/image` with correct `sizes`. Cup images load only when their card is near the viewport.
- Don't run any rAF loop while nothing is moving (film settled, no card revealed).

## 6. Keep

Everything else stays: the crossfades, camera push, copy choreography, Lenis on desktop wheel (native touch scrolling on phones),
reduced motion and all store features.

## 7. Verify

- `npm run build` and `npm run lint` pass. The e2e tests pass.
- **Wrong-clip regression test** (Playwright, `?debug`): throttle the network (Fast 3G profile) and CPU (4×) at 390 × 844.
  Immediately scroll to `#pour`, then `#sip`. At no sample may a layer for a timeline position inside clip *i* draw from another clip.
  Assert on the debug samples, and record which frame/clip was drawn.
- **Weight**: before any scrolling, the home page transfers ≤ 1.5 MB on mobile (poster + wave 0 + wave 1 + JS/CSS).
  Report the total from the network log.
- **Memory**: live `ImageBitmap` count never exceeds the caps above (expose a counter on `window.__film` under `?debug`).
- **Smoothness**: on 390 × 844 with 4× CPU throttle, a touch-style scroll through the whole film keeps the p95 frame time ≤ 20 ms.
  Do the same on desktop at 1440 × 900.
- Run Lighthouse (mobile and desktop) on a production build (`npm run build && npm start`). Report Performance / LCP / TBT / CLS
  before and after.
- Commit with clear messages. I'll push from GitHub Desktop.
