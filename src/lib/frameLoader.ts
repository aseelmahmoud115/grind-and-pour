import { FRAME_COUNT, frameUrl, type FrameSet } from "./frames";
import { CLIPS, frameVh, type Timeline } from "./timeline";

/** Wave 1 fetches every 8th frame (0008, 0016 … 0120) of every clip, so scrubbing anywhere has a frame within 4. */
const WAVE1_STRIDE = 8;
/** Frames behind the direction of travel count this much further away (≈⅓ of the window behind, ⅔ ahead). */
const BEHIND_WEIGHT = 2;
/** createImageBitmap calls in flight at once (each decodes off the main thread). */
const DECODE_CONCURRENCY = 2;
/** A failed request goes back in the queue this many times. */
const MAX_RETRIES = 2;

type Wave = 0 | 1 | 2;
type Pending = { clip: number; index: number; wave: Wave };
export type FrameHit = { bitmap: ImageBitmap; clip: number; index: number };

const keyOf = (clip: number, index: number) => clip * FRAME_COUNT + index;

/**
 * Two layers:
 * - network: every frame is fetched once as a compressed Blob through a priority
 *   queue (wave 0 → wave 1 → fill), re-ranked by distance from the scroll target;
 * - decode: only a sliding window of ImageBitmaps around the displayed position
 *   is kept (at most `cap`), plus one always-decoded anchor per clip (wave 0).
 *
 * Lookups never cross clips: `nearest(clip, …)` only returns frames of `clip`.
 */
export class FrameLoader {
  readonly set: FrameSet;
  private readonly tl: Timeline;
  private readonly concurrency: number;
  private readonly cap: number;
  private readonly onFrame: () => void;
  /** Index of each clip's anchor frame: 0001, or the still frame in still mode. */
  private readonly anchorIndex: number[];
  private readonly anchors: (ImageBitmap | null)[];

  private readonly pending = new Map<number, Pending>();
  private readonly requested = new Set<number>();
  private readonly inflight = new Map<number, AbortController>();
  private readonly blobs = new Map<number, Blob>();
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly decoding = new Set<number>();
  private readonly retries = new Map<number, number>();
  private readonly origins = new WeakMap<ImageBitmap, { clip: number; index: number }>();
  private wanted: number[] = [];

  private target = 0;
  private displayed = 0;
  private direction = 1;
  private windowAt = NaN;
  private filling = false;
  private disposed = false;
  /** Most windowed bitmaps alive at once (for the ?debug memory check). */
  peak = 0;

  constructor(opts: { set: FrameSet; tl: Timeline; concurrency: number; cap: number; onFrame: () => void }) {
    this.set = opts.set;
    this.tl = opts.tl;
    this.concurrency = opts.concurrency;
    this.cap = opts.cap;
    this.onFrame = opts.onFrame;
    this.anchorIndex = CLIPS.map((c) => (opts.tl.reduced ? c.still - 1 : 0));
    this.anchors = CLIPS.map(() => null);
  }

  /** Wave 0 (one anchor per clip), then wave 1 (every 8th frame). Still mode only needs the anchors. */
  start(position: number) {
    this.target = this.displayed = position;
    CLIPS.forEach((_, clip) => this.enqueue(clip, this.anchorIndex[clip], 0));
    if (!this.tl.reduced) {
      CLIPS.forEach((_, clip) => {
        for (let i = WAVE1_STRIDE - 1; i < FRAME_COUNT; i += WAVE1_STRIDE) this.enqueue(clip, i, 1);
      });
    }
    this.pump();
  }

  /** Everything else, nearest first. Called once the visitor starts scrolling. */
  fill() {
    if (this.filling || this.tl.reduced || this.disposed) return;
    this.filling = true;
    CLIPS.forEach((_, clip) => {
      for (let i = 0; i < FRAME_COUNT; i++) this.enqueue(clip, i, 2);
    });
    this.pump();
  }

  /** Scroll target: ranks the network queue. */
  setTarget(v: number) {
    if (v !== this.target) this.direction = v > this.target ? 1 : -1;
    this.target = v;
  }

  /** Displayed position: moves the decode window. */
  setDisplayed(v: number) {
    this.displayed = v;
    // Re-rank once the playhead has moved half a vh (≈ 0.2 frame) since the last pass.
    if (!(Math.abs(v - this.windowAt) < 0.5)) this.refreshWindow();
  }

  /** True once every clip's anchor is decoded, so every layer always has a frame of its own clip. */
  get ready() {
    return this.anchors.every(Boolean);
  }

  /** Exact frame `index` of `clip`, if decoded. */
  get(clip: number, index: number): ImageBitmap | undefined {
    if (index === this.anchorIndex[clip]) return this.anchors[clip] ?? undefined;
    return this.bitmaps.get(keyOf(clip, index));
  }

  /** The decoded frame of `clip` closest to `index`; falls back to the clip's anchor. */
  nearest(clip: number, index: number): FrameHit | null {
    let best: FrameHit | null = null;
    let bestD = Infinity;
    for (const [key, bitmap] of this.bitmaps) {
      if (Math.floor(key / FRAME_COUNT) !== clip) continue;
      const i = key % FRAME_COUNT;
      const d = Math.abs(i - index);
      if (d < bestD) {
        bestD = d;
        best = { bitmap, clip, index: i };
      }
    }
    const anchor = this.anchors[clip];
    if (anchor && Math.abs(this.anchorIndex[clip] - index) <= bestD) best = { bitmap: anchor, clip, index: this.anchorIndex[clip] };
    return best;
  }

  /** Live windowed bitmaps (anchors excluded). */
  get bitmapCount() {
    return this.bitmaps.size;
  }

  get anchorCount() {
    return this.anchors.filter(Boolean).length;
  }

  /** Where a bitmap came from (clip and 0-based frame of the URL it was fetched from). */
  source(bitmap: ImageBitmap) {
    return this.origins.get(bitmap);
  }

  /**
   * Stop loading and drop every cache except the anchors, which keep this loader
   * drawable (coarsely, never the wrong clip) while its replacement warms up.
   */
  retire() {
    this.disposed = true;
    this.inflight.forEach((c) => c.abort());
    this.inflight.clear();
    this.pending.clear();
    this.blobs.clear();
    this.bitmaps.forEach((b) => b.close());
    this.bitmaps.clear();
  }

  dispose() {
    this.retire();
    this.anchors.forEach((b) => b?.close());
    this.anchors.fill(null);
  }

  // ── Network ────────────────────────────────────────────────────────────────

  private enqueue(clip: number, index: number, wave: Wave) {
    const key = keyOf(clip, index);
    if (this.requested.has(key) || this.pending.has(key)) return;
    this.pending.set(key, { clip, index, wave });
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

  /** Distance (vh) from `v` to where `clip` shows frame `index`, with frames behind the travel direction weighted. */
  private distance(v: number, clip: number, index: number) {
    const d = frameVh(this.tl, clip, index) - v;
    const behind = Math.sign(d) === -this.direction;
    return Math.abs(d) * (behind ? BEHIND_WEIGHT : 1);
  }

  private rank(p: Pending) {
    return p.wave * 1e6 + this.clipOrder(p.clip) * 1e4 + this.distance(this.target, p.clip, p.index);
  }

  private pump() {
    while (!this.disposed && this.inflight.size < this.concurrency && this.pending.size) {
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
      this.request(best);
    }
  }

  private async request(p: Pending) {
    const key = keyOf(p.clip, p.index);
    const controller = new AbortController();
    this.pending.delete(key);
    this.requested.add(key);
    this.inflight.set(key, controller);
    try {
      const res = await fetch(frameUrl(this.set.id, CLIPS[p.clip].dir, p.index), {
        signal: controller.signal,
        priority: p.wave === 0 ? "auto" : "low",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (this.disposed) return;
      if (p.index === this.anchorIndex[p.clip]) {
        const bitmap = await createImageBitmap(blob);
        if (this.disposed) return bitmap.close();
        this.origins.set(bitmap, { clip: p.clip, index: p.index });
        this.anchors[p.clip] = bitmap;
        this.onFrame();
      } else {
        this.blobs.set(key, blob);
        this.windowAt = NaN;
        this.refreshWindow();
      }
    } catch {
      // Failed (or aborted by dispose): queue it again, a couple of times at most.
      const tries = (this.retries.get(key) ?? 0) + 1;
      this.retries.set(key, tries);
      if (!this.disposed && tries <= MAX_RETRIES) {
        this.requested.delete(key);
        this.pending.set(key, p);
      }
    } finally {
      this.inflight.delete(key);
      this.pump();
    }
  }

  // ── Decode window ──────────────────────────────────────────────────────────

  /** Keep the `cap` downloaded frames nearest the playhead decoded; close the rest. */
  private refreshWindow() {
    if (this.disposed || this.tl.reduced) return;
    const v = this.displayed;
    this.windowAt = v;
    const scored: [number, number][] = [];
    for (const key of this.blobs.keys()) {
      scored.push([this.distance(v, Math.floor(key / FRAME_COUNT), key % FRAME_COUNT), key]);
    }
    scored.sort((a, b) => a[0] - b[0]);
    this.wanted = scored.slice(0, this.cap).map(([, key]) => key);
    const keep = new Set(this.wanted);
    for (const [key, bitmap] of this.bitmaps) {
      if (!keep.has(key)) {
        bitmap.close();
        this.bitmaps.delete(key);
      }
    }
    this.decodeNext();
  }

  private decodeNext() {
    for (const key of this.wanted) {
      if (this.decoding.size >= DECODE_CONCURRENCY || this.bitmaps.size + this.decoding.size >= this.cap) return;
      if (this.bitmaps.has(key) || this.decoding.has(key)) continue;
      this.decode(key);
    }
  }

  private async decode(key: number) {
    const blob = this.blobs.get(key);
    if (!blob) return;
    this.decoding.add(key);
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      // A corrupt frame: drop it so it isn't retried every pass.
      this.blobs.delete(key);
    }
    this.decoding.delete(key);
    if (!bitmap) return;
    // The window may have moved on while this decoded.
    if (this.disposed || !this.wanted.includes(key) || this.bitmaps.size >= this.cap) {
      bitmap.close();
    } else {
      this.bitmaps.set(key, bitmap);
      this.origins.set(bitmap, { clip: Math.floor(key / FRAME_COUNT), index: key % FRAME_COUNT });
      this.peak = Math.max(this.peak, this.bitmaps.size);
      this.onFrame();
    }
    this.decodeNext();
  }
}
