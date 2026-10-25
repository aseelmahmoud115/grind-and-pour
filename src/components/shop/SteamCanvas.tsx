"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { createNoise2D } from "@/lib/noise";

type Point = { x: number; y: number };

/** Tuning, from the FOOTER-STEAM brief. */
const SPAWN_PER_S = 12; // ~10–14
const RAMP_MS = 600;
const LIFE_S = [2.4, 3.6];
const RISE_PX = [60, 110];
const RADIUS_PX = [10, 55];
const MAX_ALPHA = [0.1, 0.16];
const FADE_IN = 0.15; // share of life
const SWAY_PX_S = 26; // turbulence strength
const NOISE_SCALE = 0.012; // per px
const MAX_DPR = 1.5;
/** Start once the circle wipe (650 ms, ease-out) is about 60% done. */
const DEFAULT_DELAY_MS = 390;

type Particle = { x: number; y0: number; y: number; age: number; life: number; rise: number; alpha: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 1.6);

/** A soft warm-white blob, rendered once and drawn scaled for every particle. */
function makeSprite() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,250,240,1)");
  grad.addColorStop(0.45, "rgba(255,250,240,0.55)");
  grad.addColorStop(1, "rgba(255,250,240,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/**
 * Living steam over a cup photo: a canvas particle plume rising from the liquid
 * surface (`at`, in % of the box; `rimWidth`, % of its width), swaying on curl
 * noise so it never visibly loops.
 *
 * It exists only while needed: mounted when `active` turns on, spawning after the
 * wipe is ~60% done (ramping up over 600 ms). When `active` turns off, spawning
 * stops at once, live particles finish their lives, then the loop stops, the
 * canvas clears and unmounts. Nothing renders under reduced motion (the photo's
 * own steam stays).
 */
export function SteamCanvas({
  active,
  at,
  rimWidth = 18,
  startDelay = DEFAULT_DELAY_MS,
}: {
  active: boolean;
  at: Point;
  rimWidth?: number;
  startDelay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const startAt = useRef(0);

  // Mount as soon as the reveal starts (adjusting state while rendering, React's documented pattern).
  if (active && !mounted && !reduced) setMounted(true);

  useEffect(() => {
    activeRef.current = active;
    if (active) startAt.current = performance.now() + startDelay;
  }, [active, startDelay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!mounted || !canvas || !ctx) return;

    const sprite = makeSprite();
    const noise = createNoise2D(Math.floor(Math.random() * 1e9));
    const particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let spawnDebt = 0;
    let last = performance.now();
    let raf = 0;
    const clock0 = last;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const spawn = () => {
      const cx = (at.x / 100) * w;
      const span = (rimWidth / 100) * w;
      // Centre-weighted along the emitter line (sum of two uniforms ≈ triangular).
      const offset = ((Math.random() + Math.random()) / 2 - 0.5) * span;
      const y = (at.y / 100) * h;
      particles.push({
        x: cx + offset,
        y0: y,
        y,
        age: 0,
        life: rand(LIFE_S[0], LIFE_S[1]),
        rise: rand(RISE_PX[0], RISE_PX[1]),
        alpha: rand(MAX_ALPHA[0], MAX_ALPHA[1]),
      });
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const time = (now - clock0) / 1000;

      // Spawn (only while active), ramping up after the start delay.
      if (activeRef.current && now >= startAt.current) {
        const ramp = Math.min(1, (now - startAt.current) / RAMP_MS);
        spawnDebt += SPAWN_PER_S * ramp * dt;
        while (spawnDebt >= 1) {
          spawn();
          spawnDebt -= 1;
        }
      } else if (!activeRef.current) {
        spawnDebt = 0;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        const t = p.age / p.life;
        if (t >= 1) {
          particles.splice(i, 1);
          continue;
        }
        // Curl of a time-shifted noise field: the plume curls and sways instead of rising straight.
        const nx = p.x * NOISE_SCALE + time * 0.18;
        const ny = p.y * NOISE_SCALE - time * 0.32;
        const e = 0.6;
        const dndy = noise(nx, ny + e) - noise(nx, ny - e);
        const dndx = noise(nx + e, ny) - noise(nx - e, ny);
        p.x += (dndy / (2 * e)) * SWAY_PX_S * dt * (0.4 + t); // sway grows as it rises
        p.y0 += (-dndx / (2 * e)) * SWAY_PX_S * 0.25 * dt; // a little vertical curl too
        p.y = p.y0 - p.rise * easeOut(t); // rises, slowing as it goes

        const r = RADIUS_PX[0] + (RADIUS_PX[1] - RADIUS_PX[0]) * easeOut(t);
        const a = t < FADE_IN ? p.alpha * (t / FADE_IN) : p.alpha * Math.pow(1 - (t - FADE_IN) / (1 - FADE_IN), 1.4);
        ctx.globalAlpha = a;
        ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
      }

      // Dissolve toward the top: keep everything at the surface, fade to nothing well before the card edge.
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-in";
      const surface = (at.y / 100) * h;
      const mask = ctx.createLinearGradient(0, surface, 0, Math.max(0, surface - h * 0.42));
      mask.addColorStop(0, "rgba(0,0,0,1)");
      mask.addColorStop(0.55, "rgba(0,0,0,0.75)");
      mask.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      if (!activeRef.current && particles.length === 0) {
        // Every puff has finished: stop the loop and remove the canvas.
        ctx.clearRect(0, 0, w, h);
        raf = 0;
        setMounted(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mounted, at.x, at.y, rimWidth]);

  if (!mounted || reduced) return null;
  return <canvas ref={canvasRef} aria-hidden="true" data-steam className="pointer-events-none absolute inset-0 h-full w-full" />;
}
