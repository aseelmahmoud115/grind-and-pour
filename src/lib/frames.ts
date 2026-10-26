export const FRAME_COUNT = 120;

/** Source frames are 1248 × 704 (the desktop set); other sets are crops of them. */
export const SOURCE_W = 1248;
export const SOURCE_H = 704;

export type FrameSetId = "desktop" | "mobile";

export type FrameSet = {
  id: FrameSetId;
  w: number;
  h: number;
  /** Horizontal position of each clip's subject, as a fraction of this set's frame width. */
  focalX: readonly number[];
  /** Where each clip's frame x = 0 sits in source (desktop) px, for anything placed in source coordinates. */
  originX: readonly number[];
};

/** Versioned folder: the cache-buster for the immutable `/frames` cache. */
const FRAMES_ROOT = "/frames/v2";

export function frameUrl(set: FrameSetId, dir: string, index: number) {
  return `${FRAMES_ROOT}/${set}/${dir}/${String(index + 1).padStart(4, "0")}.webp`;
}

/**
 * "Cover" placement with a horizontal focal point: the frame fills the box,
 * and focalX is pulled as close to the box's center as possible without
 * exposing an edge. Vertical placement is centered.
 */
export function coverRect(cw: number, ch: number, focalX: number, iw: number, ih: number) {
  const scale = Math.max(cw / iw, ch / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = Math.min(0, Math.max(cw - w, cw / 2 - focalX * w));
  const y = (ch - h) / 2;
  return { x, y, w, h, scale };
}
