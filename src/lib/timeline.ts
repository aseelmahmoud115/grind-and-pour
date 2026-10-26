import { FRAME_COUNT, coverRect } from "./frames";

/**
 * The film: four clips played back to back on one pinned stage. All positions
 * on the timeline are in vh of scroll, measured from the top of the stage.
 */
export type ClipDef = {
  dir: string;
  /** Horizontal position of the main subject, as a fraction of frame width. */
  focalX: number;
  /** Scroll length of the clip's own segment. */
  weightVh: number;
  /** 1-based frame shown when the user prefers reduced motion. */
  still: number;
};

/*
 * Weights are long enough that a brisk wheel scroll (~1.1k px/s) plays at most
 * ~1.4–1.7 frames per 60 Hz tick, so the film rarely has to hold back.
 */
export const CLIPS: ClipDef[] = [
  { dir: "1-grind", focalX: 0.69, weightVh: 280, still: 192 },
  { dir: "2-exploded", focalX: 0.5, weightVh: 230, still: 96 },
  { dir: "3-pour", focalX: 0.57, weightVh: 280, still: 96 },
  { dir: "4-sip", focalX: 0.5, weightVh: 240, still: 96 },
];

/** Phones play each scene as a video instead of scrubbing it, so a scene needs much less scroll. */
export const PHONE_SCENE_VH = 130;

export type Timeline = {
  reduced: boolean;
  /** Crossfade length at each clip boundary. */
  crossfade: number;
  /** Fade from the last frame to cream before the stage unpins. */
  fadeOut: number;
  /** Total pinned scroll length. */
  length: number;
  /** Each clip's own segment. */
  segments: { start: number; end: number }[];
  /** Scroll range that plays frames 1 → 192 (segment plus half of each neighbouring crossfade). */
  spans: { from: number; to: number }[];
};

export function makeTimeline(reduced: boolean, phone = false): Timeline {
  const crossfade = reduced ? 20 : 40;
  const fadeOut = reduced ? 20 : 30;
  let at = 0;
  const segments = CLIPS.map((c) => {
    const weight = reduced ? 100 : phone ? PHONE_SCENE_VH : c.weightVh;
    const segment = { start: at, end: at + weight };
    at += weight;
    return segment;
  });
  const last = CLIPS.length - 1;
  const spans = segments.map((s, i) => ({
    from: i > 0 ? s.start - crossfade / 2 : s.start,
    to: i < last ? s.end + crossfade / 2 : s.end,
  }));
  return { reduced, crossfade, fadeOut, length: at + fadeOut, segments, spans };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 0 → 1 across the scroll range where clip `i` plays. */
export function clipProgress(tl: Timeline, i: number, v: number) {
  const { from, to } = tl.spans[i];
  return clamp01((v - from) / (to - from));
}

/**
 * Float frame position (0-based, not rounded) of clip `i` at timeline position `v`.
 * `count` is the clip's frame count.
 */
export function frameAt(tl: Timeline, i: number, v: number, count = FRAME_COUNT) {
  if (tl.reduced) return Math.round(((CLIPS[i].still - 1) * (count - 1)) / (FRAME_COUNT - 1));
  return clipProgress(tl, i, v) * (count - 1);
}

/** Frames advanced per vh of scroll at `v` (the fastest of the clips playing there). */
export function framesPerVh(tl: Timeline, v: number, count = FRAME_COUNT) {
  let rate = 0;
  for (const { from, to } of tl.spans) {
    if (v >= from && v <= to) rate = Math.max(rate, (count - 1) / (to - from));
  }
  return rate;
}

export type Layer = { clip: number; frame: number; alpha: number; push: number };

/** What to draw at `v`: one clip, or two while crossfading, plus the closing fade to cream. */
export function layersAt(tl: Timeline, v: number, count = FRAME_COUNT): { layers: Layer[]; fade: number } {
  const n = CLIPS.length;
  const half = tl.crossfade / 2;
  const fade = smoothstep((v - tl.segments[n - 1].end) / tl.fadeOut);

  for (let i = 0; i < n - 1; i++) {
    const boundary = tl.segments[i].end;
    if (v > boundary - half && v < boundary + half) {
      const t = smoothstep((v - (boundary - half)) / tl.crossfade);
      return {
        layers: [
          // The outgoing clip pushes through (×1.00 → ×1.04) while the next one fades in over it.
          { clip: i, frame: frameAt(tl, i, v, count), alpha: 1, push: tl.reduced ? 1 : 1 + 0.04 * t },
          { clip: i + 1, frame: frameAt(tl, i + 1, v, count), alpha: t, push: 1 },
        ],
        fade,
      };
    }
  }
  const clip = sceneIndexAt(tl, v);
  return { layers: [{ clip, frame: frameAt(tl, clip, v, count), alpha: 1, push: 1 }], fade };
}

/** The scene in view at `v`: the one whose own segment contains it (the last one past the end). */
export function sceneIndexAt(tl: Timeline, v: number) {
  const index = tl.segments.findIndex((s) => v < s.end);
  return index === -1 ? tl.segments.length - 1 : index;
}

/**
 * Screen rect for clip `i` at `v`: focal-point cover, plus a slow eased camera
 * push-in (×1.00 → ×1.06) with a slight upward drift (0 → −1.5% of height),
 * scaled around the clip's focal point. `scale` is screen px per frame px.
 */
export function clipRect(tl: Timeline, i: number, v: number, cw: number, ch: number, push = 1) {
  const r = coverRect(cw, ch, CLIPS[i].focalX);
  const e = tl.reduced ? 0 : easeInOutCubic(clipProgress(tl, i, v));
  const s = (1 + 0.06 * e) * push;
  const fx = r.x + CLIPS[i].focalX * r.w;
  const fy = ch / 2;
  return {
    x: fx - (fx - r.x) * s,
    y: fy - (fy - r.y) * s - 0.015 * ch * e,
    w: r.w * s,
    h: r.h * s,
    scale: r.scale * s,
  };
}

/** Global progress (0–1) at fraction `f` of scene `i`'s own segment. `f` may run past 1. */
export function sceneAt(tl: Timeline, i: number, f: number) {
  const s = tl.segments[i];
  return (s.start + f * (s.end - s.start)) / tl.length;
}

/** In-page anchors, as a fraction of their scene's segment (where its copy is fully in). */
export const STEP_ANCHORS = [
  { id: "grind", scene: 0, at: 0 },
  { id: "dial-in", scene: 1, at: 0.34 },
  { id: "pour", scene: 2, at: 0.34 },
  { id: "sip", scene: 3, at: 0.36 },
];
