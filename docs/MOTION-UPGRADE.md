# Grind & Pour — Motion Upgrade

The site works, but the scroll animation doesn't feel cinematic. I reviewed `FrameScroller.tsx`, `lib/frames.ts`
and `app/page.tsx`. Here are the causes and the required changes. Implement all of them, then verify (section 8).

## Why it feels cheap right now

1. **Raw scroll → raw frame.** The frame index is computed directly from `scrollYProgress` and rounded.
   A Windows mouse wheel moves about 100 px per notch, so the film jumps several frames, stops, jumps again.
   There is no smoothing anywhere.
2. **Hard cuts between scenes.** Grind, Pour and Sip are three separate sticky sections. When one ends, its canvas
   scrolls away like a normal page block and the next one slides in from below. That breaks the "one film" illusion.
3. **24 fps footage shown frame by frame.** With no in-between blending, slow scrolling shows visible stepping.
4. **Static text.** The copy fades in and out but doesn't move with the scroll the way the reference does
   (big type sliding and masking in and out).
5. **Late loading.** Pour and Sip only start loading one viewport before they appear. On first scroll, the nearest
   loaded frame can be far from the target, so the film skips.
6. **Canvas resolution.** DPR is capped at 2, but frames are only 1248 px wide. That means drawing up to 3840 px
   canvases for no visual gain, which costs smoothness on weaker laptops.

## 1. One continuous film (single stage)

- Replace the three `FrameScroller` sections with **one** pinned stage, i.e. one sticky full-viewport `<canvas>`,
  that plays all four clips in order: `1-grind → 2-exploded → 3-pour → 4-sip`.
- Give each clip its own scroll length (weights), e.g. grind 220vh, exploded 180vh, pour 220vh, sip 160vh.
  Compute the clip boundaries from these weights instead of splitting progress evenly.
- **Crossfade at every boundary** (about 40vh of scroll each). Draw the outgoing and incoming clips together.
  The outgoing clip also scales up slightly (×1.00 → ×1.04) while it fades, for a "push-through" feel.
- The scene copy components (GrindCopy, PourCopy, SipCopy) become overlays inside that one stage, each driven by
  its own range of the global progress. Keep all ids/anchors (`grind`, `dial-in`, `pour`, `sip`) and keep the
  step indicator working. Place anchor elements at the matching scroll offsets.
- After `4-sip` ends, the last frame fades to `--cream` over ~30vh, then the stage unpins and the Ratios band
  scrolls in. No hard cut.

## 2. Smooth scrolling (Lenis)

- `npm install lenis`. Wrap the app with `ReactLenis` (`lenis/react`), using `root`, `lerp: 0.09`, `smoothWheel: true`.
- Disable Lenis entirely when `prefers-reduced-motion: reduce`.
- Make anchor links, the navbar, "Start brewing" and the step indicator use `lenis.scrollTo(target, { offset, duration: 1.4 })`.
- Confirm that Motion's `useScroll` still reports progress correctly with Lenis (it reads native scroll, so it should).

## 3. Frame smoothing + sub-frame blending

In the render loop (not React state):

- Keep `target` (a float frame position from progress, **not rounded**) and `displayed` (a float).
- Every rAF tick: `displayed += (target - displayed) * 0.2`. Keep the rAF loop running while
  `|target - displayed| > 0.01`, then stop it. Restart it on the next progress change.
- Draw frame `floor(displayed)` at alpha 1, then frame `floor(displayed) + 1` on top with
  `alpha = displayed - floor(displayed)`. This makes the 24 fps footage look close to 60 fps.
- Only blend when both frames are loaded. Otherwise draw the nearest loaded frame.

## 4. Subtle cinematic camera (in canvas, not CSS)

- Over each clip's own progress, apply a slow push-in by drawing with an extra scale of 1.00 → 1.06 and a tiny
  vertical drift (0 → −1.5% of height), around that clip's focal point. Do this inside the cover-rect math, so it stays sharp.
- Ease it with an in-out curve. Keep it subtle: the viewer should feel it, not notice it.

## 5. Text choreography (scroll-linked, Motion)

- **Display words** (GRIND, & POUR, DIAL IN, POUR, SIP): put each line in an `overflow: hidden` wrapper.
  On enter, the line moves from `translateY(105%)` to `0`; on exit, from `0` to `-105%`. Stagger the lines by
  ~2% of the scene's progress.
  While the scene is pinned, the big word also drifts horizontally a little (`x: -3vw → +3vw`) for parallax.
- Eyebrow, body text and buttons follow the display word with a small delay (offset ranges), using fade + 24 px rise.
- Stat chips (Pour) and callouts (Dial in) appear one by one, tied to progress. They must not run on timers.
- Everything is driven by `useTransform` of the global progress. Animate only `transform`/`opacity`/`clip-path`.

## 6. Loading

- After frame 1 is painted, preload **all four clips** in order (grind fully, then exploded, pour, sip), still using
  `coarseToFine` order within each clip. Don't wait for IntersectionObserver.
- First visit: show a minimal intro overlay on `--cream` with the wordmark and a percentage counter until clip 1 is
  fully loaded and at least 50% of clip 2 is loaded (max 4 s, then continue anyway). Fade it out over 600 ms.
  Keep the thin progress line for the remaining clips.

## 7. Canvas resolution

- Set the canvas backing size to `min(cssWidth × dpr, 1.25 × FRAME_W × coverScale)`, i.e. never more than ~1.25×
  the frame's native pixels on screen. In practice, cap DPR at 1.25. Keep `imageSmoothingQuality = "high"`.

## 8. Verify before finishing

- `npm run build` must pass with no errors.
- With Playwright (headed or headless), scroll the page using `mouse.wheel(0, 100)` steps with 16 ms pauses from
  top to the products section. Log `displayed` every frame. It must change smoothly (no jumps > 1.5 frames between
  ticks once loaded), and the crossfades must show both clips.
- Measure the rAF frame time while scrolling. It should stay under ~20 ms on desktop.
- Check `prefers-reduced-motion: reduce`: no Lenis, no scrubbing, still frames, and plain fades. It should still be fully usable.
- Check widths 375, 768, 1440 and 1920. Text must never cover the main subject.
- Then summarise what changed.
