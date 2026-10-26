export const FRAME_COUNT = 192;
export const FRAME_W = 1248;
export const FRAME_H = 704;

export function frameUrl(dir: string, index: number) {
  return `/frames/${dir}/${String(index + 1).padStart(4, "0")}.webp`;
}

/**
 * "Cover" placement with a horizontal focal point: the frame fills the box,
 * and focalX is pulled as close to the box's center as possible without
 * exposing an edge. Vertical placement is centered.
 */
export function coverRect(cw: number, ch: number, focalX: number, iw = FRAME_W, ih = FRAME_H) {
  const scale = Math.max(cw / iw, ch / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = Math.min(0, Math.max(cw - w, cw / 2 - focalX * w));
  const y = (ch - h) / 2;
  return { x, y, w, h, scale };
}

/** Indices ordered so a sparse, evenly spread set arrives first (good for scrubbing). */
export function coarseToFine(indices: number[]) {
  const pending = new Set(indices);
  const out: number[] = [];
  for (const stride of [32, 16, 8, 4, 2, 1]) {
    for (const i of indices) {
      if (i % stride === 0 && pending.has(i)) {
        pending.delete(i);
        out.push(i);
      }
    }
  }
  return out;
}

export function range(from: number, to: number) {
  return Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);
}

/** Load and decode frames with a small concurrency pool. */
export async function loadFrames(
  dir: string,
  indices: number[],
  onLoad: (index: number, img: HTMLImageElement) => void,
  isCancelled: () => boolean,
  concurrency = 6,
) {
  let cursor = 0;
  const worker = async () => {
    while (cursor < indices.length && !isCancelled()) {
      const index = indices[cursor++];
      const img = new Image();
      img.src = frameUrl(dir, index);
      try {
        await img.decode();
      } catch {
        continue;
      }
      if (!isCancelled()) onLoad(index, img);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
}

/** The loaded frame closest to `target`, or null if none is loaded yet. */
export function nearestLoaded(frames: (HTMLImageElement | null)[], target: number) {
  for (let d = 0; d < frames.length; d++) {
    const before = frames[target - d];
    if (before) return { img: before, index: target - d };
    const after = frames[target + d];
    if (after) return { img: after, index: target + d };
  }
  return null;
}
