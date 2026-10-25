"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { preload } from "react-dom";
import { useMotionValue, useScroll, type MotionValue } from "motion/react";
import { FRAME_COUNT, coarseToFine, loadFrames, nearestLoaded, range } from "@/lib/frames";
import {
  CLIPS,
  STEP_ANCHORS,
  clipRect,
  framesPerVh,
  layersAt,
  makeTimeline,
  sceneAt,
  type Timeline,
} from "@/lib/timeline";
import { usePrefersReducedMotion } from "@/lib/hooks";

type FilmContext = {
  /** Smoothed global progress (0–1). Drives every overlay, so text stays in sync with the frames. */
  film: MotionValue<number>;
  /** Smoothed timeline position in vh (the same value, unnormalised). */
  position: MotionValue<number>;
  tl: Timeline;
  reduced: boolean;
  /** Size of the stage in CSS px. */
  size: { w: number; h: number };
};

const FilmCtx = createContext<FilmContext | null>(null);

export function useFilm() {
  const ctx = useContext(FilmCtx);
  if (!ctx) throw new Error("useFilm must be used inside <Film>");
  return ctx;
}

const POSTER = "/images/hero-poster.webp";
const CREAM = "#ead8bf";
/** Canvas pixels per CSS pixel. Frames are only 1248 px wide, so more is wasted work. */
const MAX_DPR = 1.25;
/** Per-tick catch-up of the displayed position towards the scroll target. */
const SMOOTHING = 0.2;
/** Stop the loop below this gap (vh), which is ≈0.01 frame on every clip. */
const SETTLE_VH = 0.01;
/**
 * Speed limit while wheel/trackpad scrolling: at most this many frames per tick,
 * so playback never visibly skips. A dropped frame slows the film for a moment
 * instead of jumping it forward.
 */
const MAX_FRAMES_PER_TICK = 1.5;
/** If a very fast scroll leaves the film this far behind, it speeds up gently… */
const LAG_FRAMES = 120;
/** …by this many extra frames per tick, per frame of lag beyond LAG_FRAMES. */
const LAG_CATCH_UP = 0.02;
/**
 * Fast travel — the target moving more than this many frames per 60 Hz tick (a nav
 * link's lenis.scrollTo, a scrollbar drag, End/PageDown, a hard flick) — lifts the
 * limit until the film is within FAST_TRAVEL_EXIT_FRAMES, so a jump lands with the
 * scroll instead of crawling through every frame in between.
 */
const FAST_TRAVEL_FRAMES = 4;
const FAST_TRAVEL_EXIT_FRAMES = 24;
/** Opaque canvas: frames are full-bleed, so the compositor never blends it with the poster below. */
const CONTEXT_OPTIONS: CanvasRenderingContext2DSettings = { alpha: false };

type DebugSample = {
  t: number;
  v: number;
  /** Time spent drawing this tick (ms). */
  cost: number;
  layers: { clip: number; frame: number; alpha: number }[];
};
type FilmDebug = { samples: DebugSample[] };

export function Film({ description, children }: { description: string; children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const tl = useMemo(() => makeTimeline(reduced), [reduced]);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[][]>(CLIPS.map(() => Array(FRAME_COUNT).fill(null)));
  // Render-loop state lives outside React.
  const loop = useRef({ target: 0, lastTarget: 0, displayed: 0, running: false, fastTravel: false, raf: 0, w: 0, h: 0 });
  const tlRef = useRef(tl);
  const debug = useRef<FilmDebug | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const film = useMotionValue(0);
  const position = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  preload(POSTER, { as: "image", fetchPriority: "high" });

  const draw = useCallback(() => {
    const started = performance.now();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", CONTEXT_OPTIONS);
    const { w, h, displayed: v } = loop.current;
    if (!canvas || !ctx || !w || !h) return;
    const t = tlRef.current;
    const { layers, fade } = layersAt(t, v);

    let drew = false;
    for (const layer of layers) {
      const list = frames.current[layer.clip];
      const r = clipRect(t, layer.clip, v, w, h, layer.push);
      const alpha = drew ? layer.alpha : 1;
      const f0 = Math.floor(layer.frame);
      const frac = layer.frame - f0;
      const a = list[f0];
      const b = list[Math.min(f0 + 1, FRAME_COUNT - 1)];
      ctx.globalAlpha = alpha;
      if (a) {
        ctx.drawImage(a, r.x, r.y, r.w, r.h);
        // Sub-frame blend: lay the next frame over at the fractional amount.
        if (b && frac > 0.001) {
          ctx.globalAlpha = alpha * frac;
          ctx.drawImage(b, r.x, r.y, r.w, r.h);
        }
      } else {
        const hit = nearestLoaded(list, Math.round(layer.frame));
        if (!hit) continue;
        ctx.drawImage(hit.img, r.x, r.y, r.w, r.h);
      }
      drew = true;
    }
    if (!drew) return;
    // An opaque canvas starts black, so it stays hidden (poster shows) until the first real frame.
    if (canvas.style.visibility !== "visible") canvas.style.visibility = "visible";
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = CREAM;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;

    debug.current?.samples.push({
      t: started,
      v,
      cost: performance.now() - started,
      layers: layers.map((l) => ({ clip: l.clip, frame: l.frame, alpha: l.alpha })),
    });
  }, []);

  const publish = useCallback(() => {
    const { displayed } = loop.current;
    position.set(displayed);
    film.set(displayed / tlRef.current.length);
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
        s.displayed += Math.max(-limit, Math.min(limit, gap * SMOOTHING));
      }
      s.lastTarget = s.target;
      publish();
      draw();
      s.raf = s.running ? requestAnimationFrame(tick) : 0;
    };
    s.raf = requestAnimationFrame(tick);
  }, [draw, publish]);

  // Scroll → float target position (never rounded).
  useEffect(() => {
    return scrollYProgress.on("change", (p) => {
      loop.current.target = p * tlRef.current.length;
      kick();
    });
  }, [scrollYProgress, kick]);

  // New timeline (reduced ↔ full): jump straight to the current position.
  useEffect(() => {
    tlRef.current = tl;
    const s = loop.current;
    s.target = s.lastTarget = s.displayed = scrollYProgress.get() * tl.length;
    publish();
    draw();
  }, [tl, scrollYProgress, publish, draw]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("debug")) {
      debug.current = { samples: [] };
      (window as unknown as { __film: FilmDebug }).__film = debug.current;
    }
    const s = loop.current;
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.running = false; // StrictMode re-runs effects; a stale flag would block the loop
    };
  }, []);

  // Canvas backing store: viewport × DPR, capped at 1.25.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d", CONTEXT_OPTIONS);
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingQuality = "high";
      }
      loop.current.w = width;
      loop.current.h = height;
      setSize({ w: width, h: height });
      draw();
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  // Preload silently: frame 1, then every clip in order (coarse → fine within each).
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    const wanted = CLIPS.map((c) => (reduced ? [c.still - 1] : range(0, FRAME_COUNT)));
    const store = (clip: number) => (index: number, img: HTMLImageElement) => {
      frames.current[clip][index] ??= img;
      if (!loop.current.running) draw();
    };
    const missing = (clip: number, indices: number[]) => indices.filter((i) => !frames.current[clip][i]);

    (async () => {
      if (!reduced) {
        await loadFrames(CLIPS[0].dir, missing(0, [0]), store(0), isCancelled, 1);
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); // after frame 1 paints
      }
      for (let c = 0; c < CLIPS.length && !cancelled; c++) {
        await loadFrames(CLIPS[c].dir, missing(c, coarseToFine(wanted[c])), store(c), isCancelled);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reduced, draw]);

  return (
    <FilmCtx.Provider value={{ film, position, tl, reduced, size }}>
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
          style={{ backgroundImage: `url(${POSTER})`, backgroundPosition: `${CLIPS[0].focalX * 100}% 50%` }}
        >
          <canvas ref={canvasRef} aria-hidden="true" className="invisible absolute inset-0 h-full w-full" />
          <p className="sr-only">{description}</p>
          {children}
        </div>
      </section>
    </FilmCtx.Provider>
  );
}
