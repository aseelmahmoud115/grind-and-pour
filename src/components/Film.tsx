"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { preload } from "react-dom";
import { useMotionValue, useScroll, type MotionValue } from "motion/react";
import { FRAME_COUNT, MOBILE_QUERY, coarseToFine, loadFrames, nearestLoaded, phonePosterUrl, range } from "@/lib/frames";
import { CLIPS, STEP_ANCHORS, clipRect, framesPerVh, layersAt, makeTimeline, sceneAt, type Timeline } from "@/lib/timeline";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks";
import { PhoneFilm } from "@/components/PhoneFilm";

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
/** Phones: scene 1's video poster, placed like <PhoneFilm> shows it by .film-stage (globals.css). */
const MOBILE_POSTER = phonePosterUrl(CLIPS[0].dir);
const NOT_MOBILE_QUERY = `not all and ${MOBILE_QUERY}`;
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
  /** What each layer asked for, the clip/frame of the image drawn for it (null: cream), and where. */
  layers: { clip: number; frame: number; alpha: number; drawn: { clip: number; frame: number } | null; rect: { y: number; h: number } }[];
};
type FilmDebug = { samples: DebugSample[]; readonly mobile: boolean; readonly loaded: number };

type Pick = { img: HTMLImageElement; next: HTMLImageElement | null; frac: number } | null;

export function Film({ description, children }: { description: string; children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const tl = useMemo(() => makeTimeline(reduced, mobile), [reduced, mobile]);
  // Both scroll lengths go to CSS, so a phone gets its (shorter) one before hydration too.
  const desktopTl = useMemo(() => makeTimeline(reduced), [reduced]);
  const phoneTl = useMemo(() => makeTimeline(reduced, true), [reduced]);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[][]>(CLIPS.map(() => Array(FRAME_COUNT).fill(null)));
  /** Clip and 0-based frame of every loaded desktop frame (for ?debug). */
  const origins = useRef(new WeakMap<HTMLImageElement, { clip: number; index: number }>());
  /** Phones: <PhoneFilm> plays a video per scene, so there are no frames, canvas or render loop. */
  const mobileRef = useRef(false);
  // Render-loop state lives outside React.
  const loop = useRef({ target: 0, lastTarget: 0, displayed: 0, running: false, fastTravel: false, raf: 0, w: 0, h: 0 });
  const tlRef = useRef(tl);
  const debug = useRef<FilmDebug | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const film = useMotionValue(0);
  const position = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  preload(POSTER, { as: "image", fetchPriority: "high", media: NOT_MOBILE_QUERY });
  preload(MOBILE_POSTER, { as: "image", fetchPriority: "high", media: MOBILE_QUERY });

  const draw = useCallback(() => {
    const started = performance.now();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", CONTEXT_OPTIONS);
    const { w, h, displayed: v } = loop.current;
    if (!canvas || !ctx || !w || !h) return;
    const t = tlRef.current;
    const { layers, fade } = layersAt(t, v);

    // Each layer only ever draws frames of its own clip: the exact frame plus the next
    // one for the sub-frame blend, else the nearest loaded frame of that clip.
    const picks: Pick[] = layers.map((layer) => {
      const list = frames.current[layer.clip];
      const f0 = Math.floor(layer.frame);
      const frac = layer.frame - f0;
      const a = list[f0];
      if (a) return { img: a, next: frac > 0.001 ? list[Math.min(f0 + 1, FRAME_COUNT - 1)] : null, frac };
      const hit = nearestLoaded(list, Math.round(layer.frame));
      return hit ? { img: hit.img, next: null, frac: 0 } : null;
    });
    // An opaque canvas starts black, so it stays hidden until the first real frame and the
    // poster (clip 1's first frame) shows meanwhile, but only while inside clip 1.
    const hidden = canvas.style.visibility !== "visible";
    if (hidden && !picks.some(Boolean) && v < t.segments[0].end) return;

    const rects = layers.map((layer) => clipRect(t, layer.clip, v, w, h, layer.push));
    layers.forEach((layer, n) => {
      const pick = picks[n];
      const r = rects[n];
      const alpha = n === 0 ? 1 : layer.alpha;
      ctx.globalAlpha = alpha;
      if (!pick) {
        // This clip has nothing loaded yet: cream, never another clip's frame.
        ctx.fillStyle = CREAM;
        ctx.fillRect(0, 0, w, h);
        return;
      }
      ctx.drawImage(pick.img, r.x, r.y, r.w, r.h);
      // Sub-frame blend: lay the next frame over at the fractional amount.
      if (pick.next) {
        ctx.globalAlpha = alpha * pick.frac;
        ctx.drawImage(pick.next, r.x, r.y, r.w, r.h);
      }
    });
    if (hidden) canvas.style.visibility = "visible";
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
      layers: layers.map((l, n) => {
        const img = picks[n]?.img;
        const src = img && origins.current.get(img);
        return {
          clip: l.clip,
          frame: l.frame,
          alpha: l.alpha,
          drawn: src ? { clip: src.clip, frame: src.index } : null,
          rect: { y: rects[n].y, h: rects[n].h },
        };
      }),
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
      const s = loop.current;
      s.target = p * tlRef.current.length;
      if (mobileRef.current) {
        // Phones: nothing to ease (no frames), so no loop: the copy follows the scroll directly.
        s.displayed = s.lastTarget = s.target;
        publish();
        return;
      }
      kick();
    });
  }, [scrollYProgress, kick, publish]);

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
      debug.current = {
        samples: [],
        get mobile() {
          return mobileRef.current;
        },
        get loaded() {
          return frames.current.flat().filter(Boolean).length;
        },
      };
      (window as unknown as { __film: FilmDebug }).__film = debug.current;
    }
    const s = loop.current;
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.running = false; // StrictMode re-runs effects; a stale flag would block the loop
    };
  }, []);

  useEffect(() => {
    mobileRef.current = mobile;
  }, [mobile]);

  // Canvas backing store: viewport × DPR, capped at 1.25. Phones have no canvas.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", CONTEXT_OPTIONS);
      if (canvas && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
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
  }, [draw, mobile]);

  // Preload silently: frame 1, then every clip in order (coarse → fine within each).
  // Not on phones (checked directly too, since `mobile` is false until hydration ends).
  useEffect(() => {
    if (mobile || window.matchMedia(MOBILE_QUERY).matches) return;
    let cancelled = false;
    const isCancelled = () => cancelled;
    const wanted = CLIPS.map((c) => (reduced ? [c.still - 1] : range(0, FRAME_COUNT)));
    const store = (clip: number) => (index: number, img: HTMLImageElement) => {
      frames.current[clip][index] ??= img;
      origins.current.set(img, { clip, index });
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
  }, [reduced, draw, mobile]);

  return (
    <FilmCtx.Provider value={{ film, position, tl, reduced, size }}>
      <section
        id="method"
        ref={sectionRef}
        aria-label="The pour-over method"
        className="relative h-(--film-h) phone:h-(--film-h-phone)"
        style={{ "--film-h": `${desktopTl.length + 100}vh`, "--film-h-phone": `${phoneTl.length + 100}vh` } as CSSProperties}
      >
        {STEP_ANCHORS.map((a) => (
          <div
            key={a.id}
            id={a.id}
            aria-hidden="true"
            className="absolute top-(--at) left-0 h-px w-px phone:top-(--at-phone)"
            style={
              {
                "--at": `${sceneAt(desktopTl, a.scene, a.at) * desktopTl.length}vh`,
                "--at-phone": `${sceneAt(phoneTl, a.scene, a.at) * phoneTl.length}vh`,
              } as CSSProperties
            }
          />
        ))}
        <div
          ref={stageRef}
          className="film-stage sticky top-0 h-dvh w-full overflow-hidden bg-cream bg-cover"
          style={{ backgroundImage: `url(${POSTER})`, backgroundPosition: `${CLIPS[0].focalX * 100}% 50%` }}
        >
          {mobile ? (
            <PhoneFilm key={reduced ? "posters" : "videos"} tl={tl} position={position} reduced={reduced} />
          ) : (
            <canvas ref={canvasRef} aria-hidden="true" className="invisible absolute inset-0 h-full w-full" />
          )}
          <p className="sr-only">{description}</p>
          {children}
        </div>
      </section>
    </FilmCtx.Provider>
  );
}
