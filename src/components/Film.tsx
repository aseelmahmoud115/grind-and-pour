"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { preload } from "react-dom";
import { useMotionValue, useScroll, type MotionValue } from "motion/react";
import { FrameLoader, type FrameHit } from "@/lib/frameLoader";
import { FRAME_COUNT, type FrameSet, type FrameSetId } from "@/lib/frames";
import {
  FRAME_SETS,
  STEP_ANCHORS,
  clipRect,
  framesPerVh,
  layersAt,
  makeTimeline,
  sceneAt,
  type Layer,
  type Timeline,
} from "@/lib/timeline";
import { useLowData, useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks";

type FilmContext = {
  /** Smoothed global progress (0–1). Drives every overlay, so text stays in sync with the frames. */
  film: MotionValue<number>;
  /** Smoothed timeline position in vh (the same value, unnormalised). */
  position: MotionValue<number>;
  tl: Timeline;
  /** Still-frame mode (reduced motion, data saver or a slow network): plain fades, no motion. */
  reduced: boolean;
  /** Size of the stage in CSS px. */
  size: { w: number; h: number };
  /** The frame set on the canvas, for anything placed in frame coordinates. */
  set: FrameSet;
};

const FilmCtx = createContext<FilmContext | null>(null);

export function useFilm() {
  const ctx = useContext(FilmCtx);
  if (!ctx) throw new Error("useFilm must be used inside <Film>");
  return ctx;
}

const POSTER = "/images/hero-poster.webp";
const CREAM = "#ead8bf";
/** Portrait phones get the 512 px-wide subject crops. */
const MOBILE_QUERY = "(max-width: 767px) and (orientation: portrait)";

type Profile = {
  /** Canvas pixels per CSS pixel; frames are only 1248 (or 512) px wide, so more is wasted work. */
  maxDpr: number;
  /** Lay the next frame over at the fractional amount (a second drawImage per layer). */
  blend: boolean;
  /** Per-tick catch-up of the displayed position towards the scroll target. */
  smoothing: number;
  smoothingQuality: ImageSmoothingQuality;
  /** Parallel frame requests. */
  concurrency: number;
  /** Decoded frames kept around the playhead (the four anchors don't count). */
  cap: number;
};

const PROFILES: Record<FrameSetId, Profile> = {
  desktop: { maxDpr: 1.25, blend: true, smoothing: 0.2, smoothingQuality: "high", concurrency: 4, cap: 48 },
  // Phones: one drawImage per layer, and a film that follows the finger closely.
  mobile: { maxDpr: 1, blend: false, smoothing: 0.35, smoothingQuality: "medium", concurrency: 3, cap: 28 },
};

/** Stop the loop below this gap (vh), well under 0.01 frame on every clip. */
const SETTLE_VH = 0.01;
/** The limits below were tuned on 192-frame clips; they're in frames, so they scale to 120. */
const RETUNE = FRAME_COUNT / 192;
/**
 * Speed limit while wheel/trackpad scrolling: at most this many frames per tick,
 * so playback never visibly skips. A dropped frame slows the film for a moment
 * instead of jumping it forward.
 */
const MAX_FRAMES_PER_TICK = 1.5 * RETUNE;
/** If a very fast scroll leaves the film this far behind, it speeds up gently… */
const LAG_FRAMES = 120 * RETUNE;
/** …by this many extra frames per tick, per frame of lag beyond LAG_FRAMES. */
const LAG_CATCH_UP = 0.02;
/**
 * Fast travel — the target moving more than this many frames per 60 Hz tick (a nav
 * link's lenis.scrollTo, a scrollbar drag, End/PageDown, a hard flick) — lifts the
 * limit until the film is within FAST_TRAVEL_EXIT_FRAMES, so a jump lands with the
 * scroll instead of crawling through every frame in between.
 */
const FAST_TRAVEL_FRAMES = 4 * RETUNE;
const FAST_TRAVEL_EXIT_FRAMES = 24 * RETUNE;
/** Loading starts once the page is idle after first paint, or after this long at most. */
const IDLE_TIMEOUT_MS = 1500;
/** Opaque canvas: frames are full-bleed, so the compositor never blends it with the poster below. */
const CONTEXT_OPTIONS: CanvasRenderingContext2DSettings = { alpha: false };

type DebugSample = {
  t: number;
  v: number;
  /** Time spent drawing this tick (ms). */
  cost: number;
  set: FrameSetId;
  /** What each layer asked for, and the clip/frame of the bitmap actually drawn for it. */
  layers: { clip: number; frame: number; alpha: number; drawn: { clip: number; frame: number } | null; blend: number }[];
};
type FilmDebug = {
  samples: DebugSample[];
  readonly set: FrameSetId | null;
  /** Live windowed ImageBitmaps (anchors excluded), and the most there have been at once. */
  readonly bitmaps: number;
  readonly peakBitmaps: number;
  readonly anchors: number;
  readonly cap: number;
  readonly tl: Timeline;
};

type Planned = { layer: Layer; r: ReturnType<typeof clipRect>; alpha: number; hit: FrameHit; next?: ImageBitmap; frac: number };

export function Film({ description, children }: { description: string; children: ReactNode }) {
  const prefersReduced = usePrefersReducedMotion();
  const lowData = useLowData();
  const reduced = prefersReduced || lowData;
  const setId: FrameSetId = useMediaQuery(MOBILE_QUERY) ? "mobile" : "desktop";
  const set = FRAME_SETS[setId];
  const profile = PROFILES[setId];
  const tl = useMemo(() => makeTimeline(reduced), [reduced]);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** `previous` keeps drawing (anchors only) after a set switch until `current` is ready. */
  const loaders = useRef<{ current: FrameLoader | null; previous: FrameLoader | null }>({ current: null, previous: null });
  // Render-loop state lives outside React.
  const loop = useRef({ target: 0, lastTarget: 0, displayed: 0, running: false, fastTravel: false, raf: 0, w: 0, h: 0, scrolled: false });
  const lastDraw = useRef<{ loader: FrameLoader | null; key: number[] }>({ loader: null, key: [] });
  const tlRef = useRef(tl);
  const profileRef = useRef(profile);
  const debug = useRef<FilmDebug | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const film = useMotionValue(0);
  const position = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  preload(POSTER, { as: "image", fetchPriority: "high" });

  const draw = useCallback(() => {
    const started = performance.now();
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const ctx = canvas?.getContext("2d", CONTEXT_OPTIONS);
    const { w, h, displayed: v } = loop.current;
    if (!canvas || !stage || !ctx || !w || !h) return;
    const t = tlRef.current;
    const slot = loaders.current;
    const loader = slot.current?.ready ? slot.current : slot.previous?.ready ? slot.previous : null;

    if (!loader) {
      // Not every clip has a frame yet: keep the canvas hidden. The poster is clip 1's
      // first frame, so it only shows inside clip 1; elsewhere the stage stays cream.
      canvas.style.visibility = "hidden";
      stage.style.backgroundImage = v < t.segments[0].end ? `url(${POSTER})` : "none";
      lastDraw.current = { loader: null, key: [] };
      return;
    }
    if (loader === slot.current && slot.previous) {
      slot.previous.dispose();
      slot.previous = null;
    }

    // Resolve every layer to a bitmap of its own clip: the exact frame, else the
    // nearest decoded one, else that clip's anchor (always decoded once ready).
    const { blend } = profileRef.current;
    const { layers, fade } = layersAt(t, v);
    const plan: Planned[] = layers.map((layer, n) => {
      const r = clipRect(t, loader.set, layer.clip, v, w, h, layer.push);
      const index = blend ? Math.floor(layer.frame) : Math.round(layer.frame);
      const frac = layer.frame - index;
      const exact = loader.get(layer.clip, index);
      const hit = exact ? { bitmap: exact, clip: layer.clip, index } : loader.nearest(layer.clip, index)!;
      const next = blend && exact && frac > 0.001 ? loader.get(layer.clip, Math.min(index + 1, FRAME_COUNT - 1)) : undefined;
      return { layer, r, alpha: n === 0 ? 1 : layer.alpha, hit, next, frac: next ? frac : 0 };
    });

    // Nothing changed since the last draw (same bitmaps, alphas and rects): skip it.
    const key = [w, h, fade];
    for (const p of plan) key.push(p.hit.clip, p.hit.index, p.next ? 1 : 0, p.frac, p.alpha, p.r.x, p.r.y, p.r.w, p.r.h);
    const last = lastDraw.current;
    if (last.loader === loader && last.key.length === key.length && last.key.every((k, i) => k === key[i])) return;
    lastDraw.current = { loader, key };

    for (const p of plan) {
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(p.hit.bitmap, p.r.x, p.r.y, p.r.w, p.r.h);
      if (p.next) {
        ctx.globalAlpha = p.alpha * p.frac;
        ctx.drawImage(p.next, p.r.x, p.r.y, p.r.w, p.r.h);
      }
    }
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = CREAM;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
    // An opaque canvas starts black, so it stays hidden (poster shows) until the first real frame.
    if (canvas.style.visibility !== "visible") canvas.style.visibility = "visible";

    debug.current?.samples.push({
      t: started,
      v,
      cost: performance.now() - started,
      set: loader.set.id,
      layers: plan.map((p) => {
        const src = loader.source(p.hit.bitmap);
        return {
          clip: p.layer.clip,
          frame: p.layer.frame,
          alpha: p.alpha,
          drawn: src ? { clip: src.clip, frame: src.index } : null,
          blend: p.frac,
        };
      }),
    });
  }, []);

  const publish = useCallback(() => {
    const { displayed } = loop.current;
    position.set(displayed);
    film.set(displayed / tlRef.current.length);
    loaders.current.current?.setDisplayed(displayed);
  }, [film, position]);

  // rAF loop: ease `displayed` towards `target`, run only until it settles.
  const kick = useCallback(() => {
    const s = loop.current;
    if (s.running) return;
    s.running = true;
    let lastTime = performance.now();
    const tick = (now: number) => {
      // Elapsed time in 60 Hz ticks, so a dropped frame isn't mistaken for fast travel.
      const elapsed = Math.min(Math.max((now - lastTime) / (1000 / 60), 1), 10);
      lastTime = now;
      const t = tlRef.current;
      const gap = s.target - s.displayed;
      if (t.reduced || Math.abs(gap) < SETTLE_VH) {
        s.displayed = s.target;
        s.running = false;
      } else {
        // Ease towards the target, within the film's speed limit (in frames).
        const rate = framesPerVh(t, s.displayed) || 1;
        const behind = Math.abs(gap) * rate;
        const targetSpeed = (Math.abs(s.target - s.lastTarget) * rate) / elapsed;
        if (targetSpeed > FAST_TRAVEL_FRAMES) s.fastTravel = true;
        else if (behind < FAST_TRAVEL_EXIT_FRAMES) s.fastTravel = false;
        const limit = s.fastTravel
          ? Infinity
          : (MAX_FRAMES_PER_TICK + Math.max(0, behind - LAG_FRAMES) * LAG_CATCH_UP) / rate;
        s.displayed += Math.max(-limit, Math.min(limit, gap * profileRef.current.smoothing));
      }
      s.lastTarget = s.target;
      publish();
      draw();
      s.raf = s.running ? requestAnimationFrame(tick) : 0;
    };
    s.raf = requestAnimationFrame(tick);
  }, [draw, publish]);

  // Scroll → float target position (never rounded). The first scroll also starts the full download.
  useEffect(() => {
    return scrollYProgress.on("change", (p) => {
      const s = loop.current;
      s.target = p * tlRef.current.length;
      s.scrolled = true;
      loaders.current.current?.setTarget(s.target);
      loaders.current.current?.fill();
      kick();
    });
  }, [scrollYProgress, kick]);

  // New timeline (still ↔ full): jump straight to the current position.
  useEffect(() => {
    tlRef.current = tl;
    const s = loop.current;
    s.target = s.lastTarget = s.displayed = scrollYProgress.get() * tl.length;
    if (s.target > 0) s.scrolled = true; // arrived mid-page (a #step link or a restored scroll)
    publish();
    draw();
  }, [tl, scrollYProgress, publish, draw]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const s = loop.current;
    const slot = loaders.current;
    if (new URLSearchParams(window.location.search).has("debug")) {
      const all = () => [slot.current, slot.previous].filter((l): l is FrameLoader => !!l);
      debug.current = {
        samples: [],
        get set() {
          return slot.current?.set.id ?? null;
        },
        get bitmaps() {
          return all().reduce((n, l) => n + l.bitmapCount, 0);
        },
        get peakBitmaps() {
          return Math.max(0, ...all().map((l) => l.peak));
        },
        get anchors() {
          return slot.current?.anchorCount ?? 0;
        },
        get cap() {
          return profileRef.current.cap;
        },
        get tl() {
          return tlRef.current;
        },
      };
      (window as unknown as { __film: FilmDebug }).__film = debug.current;
    }
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.running = false; // StrictMode re-runs effects; a stale flag would block the loop
      slot.current?.dispose();
      slot.previous?.dispose();
      slot.current = slot.previous = null;
    };
  }, []);

  // Canvas backing store: viewport × DPR, capped per frame set.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d", CONTEXT_OPTIONS);
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingQuality = profile.smoothingQuality;
      }
      loop.current.w = width;
      loop.current.h = height;
      lastDraw.current = { loader: null, key: [] }; // resizing cleared the canvas
      setSize({ w: width, h: height });
      draw();
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw, profile]);

  // Loader per frame set and timeline, started once the page is idle after first paint.
  // On a switch (rotation, still ↔ full) the old one keeps its anchors until the new one is ready.
  useEffect(() => {
    const begin = () => {
      const slot = loaders.current;
      const s = loop.current;
      const loader = new FrameLoader({
        set,
        tl,
        concurrency: profile.concurrency,
        cap: profile.cap,
        onFrame: () => {
          if (!loop.current.running) draw();
        },
      });
      // Keep whichever outgoing loader can still draw (a not-yet-ready one has nothing to show).
      if (slot.current?.ready) {
        slot.previous?.dispose();
        slot.current.retire();
        slot.previous = slot.current;
      } else {
        slot.current?.dispose();
      }
      slot.current = loader;
      loader.setTarget(s.target);
      loader.start(s.target);
      loader.setDisplayed(s.displayed);
      if (s.scrolled) loader.fill();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(begin, { timeout: IDLE_TIMEOUT_MS });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(begin, 200);
    return () => window.clearTimeout(id);
  }, [set, tl, profile, draw]);

  return (
    <FilmCtx.Provider value={{ film, position, tl, reduced, size, set }}>
      <section
        id="method"
        ref={sectionRef}
        aria-label="The pour-over method"
        className="relative"
        style={{ height: `${tl.length + 100}vh` }}
      >
        {STEP_ANCHORS.map((a) => (
          <div
            key={a.id}
            id={a.id}
            aria-hidden="true"
            className="absolute left-0 h-px w-px"
            style={{ top: `${sceneAt(tl, a.scene, a.at) * tl.length}vh` }}
          />
        ))}
        <div
          ref={stageRef}
          className="sticky top-0 h-dvh w-full overflow-hidden bg-cream bg-cover"
          style={{ backgroundImage: `url(${POSTER})`, backgroundPosition: `${FRAME_SETS.desktop.focalX[0] * 100}% 50%` }}
        >
          <canvas ref={canvasRef} aria-hidden="true" className="invisible absolute inset-0 h-full w-full" />
          <p className="sr-only">{description}</p>
          {children}
        </div>
      </section>
    </FilmCtx.Provider>
  );
}
