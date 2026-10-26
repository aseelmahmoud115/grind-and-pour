import { MOBILE_FRAME_COUNT, mobileFrameUrl } from "./frames";
import { CLIPS, frameAt, frameVh, framesPerVh, layersAt, type Timeline } from "./timeline";

const COUNT = MOBILE_FRAME_COUNT;
/** Parallel image requests. */
const CONCURRENCY = 4;
/** Wave 1 loads every 8th frame (0008, 0016 … 0120) of every clip, so scrubbing anywhere has a frame within 4. */
const WAVE1_STRIDE = 8;
/** Frames behind the scroll direction count this much further away when ranking the queue. */
const BEHIND_WEIGHT = 2;
/** A failed load goes back in the queue this many times. */
const MAX_RETRIES = 2;
/** Frames ahead of the playhead decoded in advance, and decodes in flight at once. */
const LOOKAHEAD_FRAMES = 16;
const LOOKAHEAD_CONCURRENCY = 4;

type Wave = 0 | 1 | 2;
type Pending = { clip: number; index: number; wave: Wave };

const keyOf = (clip: number, index: number) => clip * COUNT + index;

/**
 * Loads the phone frames as plain <img> elements through one priority queue:
 * 1. wave 0: frame 0001 of every clip (the still frame under reduced motion);
 * 2. wave 1: every 8th frame of every clip, the clip at the scroll position first;
 * 3. every other frame, nearest the scroll position first (ahead of the scroll
 *    direction before behind).
 *
 * Frames aren't force-decoded: the browser manages decoded memory, and only the
 * ~16 frames the playhead reaches next are decoded ahead of time.
 *
 * Lookups never cross clips: `nearest(clip, …)` only returns frames of `clip`.
 */
export class MobileFrameLoader {
  private readonly tl: Timeline;
  private readonly onFrame: () => void;
  /** Loaded frames, per clip. */
  private readonly frames: (HTMLImageElement | null)[][];
  /** Each clip's first frame to load (0001, or the still frame under reduced motion). */
  private readonly anchorIndex: number[];
  private readonly origins = new WeakMap<HTMLImageElement, { clip: number; index: number }>();

  private readonly pending = new Map<number, Pending>();
  private readonly inflight = new Map<number, HTMLImageElement>();
  private readonly retries = new Map<number, number>();
  private readonly decoded = new WeakSet<HTMLImageElement>();
  private readonly decoding = new Set<HTMLImageElement>();

  private target = 0;
  private displayed = 0;
  private direction = 1;
  private lookaheadAt = NaN;
  private disposed = false;
  /** Frames loaded, and decoded ahead of time, so far (for ?debug). */
  loaded = 0;
  decodedCount = 0;

  constructor(tl: Timeline, onFrame: () => void) {
    this.tl = tl;
    this.onFrame = onFrame;
    this.frames = CLIPS.map(() => Array<HTMLImageElement | null>(COUNT).fill(null));
    this.anchorIndex = CLIPS.map((_, i) => (tl.reduced ? frameAt(tl, i, 0, COUNT) : 0));
  }

  /** Queue every frame (waves 0, 1, then the rest) and start loading. Still mode only needs the anchors. */
  start(position: number) {
    this.target = this.displayed = position;
    CLIPS.forEach((_, clip) => this.enqueue(clip, this.anchorIndex[clip], 0));
    if (!this.tl.reduced) {
      CLIPS.forEach((_, clip) => {
        for (let i = WAVE1_STRIDE - 1; i < COUNT; i += WAVE1_STRIDE) this.enqueue(clip, i, 1);
        for (let i = 0; i < COUNT; i++) this.enqueue(clip, i, 2);
      });
    }
    this.pump();
  }

  /** Scroll position: ranks the queue. */
  setTarget(v: number) {
    if (v !== this.target) this.direction = v > this.target ? 1 : -1;
    this.target = v;
  }

  /** Displayed position: moves the decode look-ahead. */
  setDisplayed(v: number) {
    this.displayed = v;
    // Re-aim once the playhead has moved half a vh (≈ 0.2 frame) since the last pass.
    if (!(Math.abs(v - this.lookaheadAt) < 0.5)) this.lookahead();
  }

  get(clip: number, index: number) {
    return this.frames[clip][index] ?? undefined;
  }

  /** The loaded frame of `clip` closest to `index`, searching outward from it. */
  nearest(clip: number, index: number) {
    const list = this.frames[clip];
    for (let d = 0; d < COUNT; d++) {
      const before = list[index - d];
      if (before) return before;
      const after = list[index + d];
      if (after) return after;
    }
    return undefined;
  }

  /** Where a frame came from (clip and 0-based frame of its URL), for ?debug. */
  source(img: HTMLImageElement) {
    return this.origins.get(img);
  }

  dispose() {
    this.disposed = true;
    this.inflight.forEach((img) => img.removeAttribute("src"));
    this.inflight.clear();
    this.pending.clear();
    this.frames.forEach((list) => list.fill(null));
  }

  // ── Network ────────────────────────────────────────────────────────────────

  private enqueue(clip: number, index: number, wave: Wave) {
    const key = keyOf(clip, index);
    if (!this.pending.has(key)) this.pending.set(key, { clip, index, wave });
  }

  /** Clips playing at the target first, then the ones ahead (nearest first), then the ones behind. */
  private clipOrder(clip: number) {
    const v = this.target;
    const { from, to } = this.tl.spans[clip];
    if (v >= from && v <= to) return 0;
    const ahead = (from > v ? 1 : -1) === this.direction;
    const gap = Math.min(Math.abs(from - v), Math.abs(to - v));
    return (ahead ? 1 : 1 + CLIPS.length) + gap / this.tl.length;
  }

  /** Distance (vh) from the target to where `clip` shows frame `index`, frames behind the scroll direction weighted. */
  private distance(clip: number, index: number) {
    const d = frameVh(this.tl, clip, index, COUNT) - this.target;
    return Math.abs(d) * (Math.sign(d) === -this.direction ? BEHIND_WEIGHT : 1);
  }

  private rank(p: Pending) {
    // Waves 0 and 1 go clip by clip (the clip at the target first); the rest is nearest-first across clips.
    const order = p.wave < 2 ? p.wave * 1e6 + this.clipOrder(p.clip) * 1e4 : 2e6;
    return order + this.distance(p.clip, p.index);
  }

  private pump() {
    while (!this.disposed && this.inflight.size < CONCURRENCY && this.pending.size) {
      let best: Pending | null = null;
      let bestRank = Infinity;
      for (const p of this.pending.values()) {
        const r = this.rank(p);
        if (r < bestRank) {
          bestRank = r;
          best = p;
        }
      }
      if (!best) return;
      this.load(best);
    }
  }

  private load(p: Pending) {
    const key = keyOf(p.clip, p.index);
    this.pending.delete(key);
    if (this.frames[p.clip][p.index]) return this.pump();
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = p.wave === 0 ? "auto" : "low";
    this.inflight.set(key, img);
    img.onload = () => {
      this.inflight.delete(key);
      if (this.disposed) return;
      this.origins.set(img, { clip: p.clip, index: p.index });
      this.frames[p.clip][p.index] = img;
      this.loaded++;
      this.lookaheadAt = NaN;
      this.onFrame();
      this.pump();
    };
    img.onerror = () => {
      this.inflight.delete(key);
      if (this.disposed) return;
      const tries = (this.retries.get(key) ?? 0) + 1;
      this.retries.set(key, tries);
      if (tries <= MAX_RETRIES) this.pending.set(key, p);
      this.pump();
    };
    img.src = mobileFrameUrl(CLIPS[p.clip].dir, p.index);
  }

  // ── Decode look-ahead ──────────────────────────────────────────────────────

  /** Decode (fire-and-forget) the loaded frames the playhead reaches next, in the scroll direction. */
  private lookahead() {
    if (this.tl.reduced || this.disposed) return;
    const v = this.displayed;
    this.lookaheadAt = v;
    const vhPerFrame = 1 / (framesPerVh(this.tl, v, COUNT) || 1);
    for (let k = 0; k <= LOOKAHEAD_FRAMES; k++) {
      for (const layer of layersAt(this.tl, v + this.direction * k * vhPerFrame, COUNT).layers) {
        if (this.decoding.size >= LOOKAHEAD_CONCURRENCY) return;
        const img = this.frames[layer.clip][Math.round(layer.frame)];
        if (!img || this.decoded.has(img) || this.decoding.has(img)) continue;
        this.decoding.add(img);
        img
          .decode()
          .then(() => {
            this.decoded.add(img);
            this.decodedCount++;
          })
          .catch(() => {})
          .finally(() => {
            this.decoding.delete(img);
            if (!this.disposed) this.lookahead();
          });
      }
    }
  }
}
