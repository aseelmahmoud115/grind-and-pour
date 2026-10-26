import type { CDPSession, Page } from "@playwright/test";
import { expect, test } from "./helpers";

/*
 * The scroll film under ?debug: Film.tsx exposes window.__film with every draw
 * (what each layer asked for, the clip/frame of the image drawn for it, or null
 * for cream, and the frame's rect) and how many frames have loaded.
 */
type Layer = { clip: number; frame: number; alpha: number; drawn: { clip: number; frame: number } | null; rect: { y: number; h: number } };
type Sample = { t: number; v: number; layers: Layer[]; mobile: boolean };
type Debug = { samples: Sample[]; mobile: boolean; loaded: number; decoded: number };

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const SMALL_PHONE = { viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const PHONE_FRAMES = 4 * 120;
/** DevTools' "Fast 3G" profile. */
const FAST_3G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024 * 0.9) / 8, uploadThroughput: (750 * 1024 * 0.9) / 8 };

/**
 * Sleeps on the test side: page.waitForTimeout runs script in the page, which under
 * 4× CPU throttling would show up as the site's own work.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const debug = (page: Page) => page.evaluate(() => {
  const f = (window as unknown as { __film: Debug }).__film;
  return { samples: f.samples, mobile: f.mobile, loaded: f.loaded, decoded: f.decoded };
});
const sampleCount = (page: Page) => page.evaluate(() => (window as unknown as { __film: Debug }).__film.samples.length);
const waitForLoaded = (page: Page, count: number, timeout: number) =>
  page.waitForFunction((n) => ((window as unknown as { __film?: Debug }).__film?.loaded ?? 0) >= n, count, { timeout, polling: 500 });
const scrollToAnchor = (page: Page, id: string) =>
  page.evaluate((anchor) => document.getElementById(anchor)!.scrollIntoView({ behavior: "instant" }), id);
const filmEnd = (page: Page) => page.evaluate(() => {
  const el = document.getElementById("method")!;
  return el.offsetTop + el.offsetHeight - innerHeight;
});

async function throttle(page: Page, opts: { network?: boolean; cpu?: number }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  if (opts.network) await cdp.send("Network.emulateNetworkConditions", FAST_3G);
  if (opts.cpu) await cdp.send("Emulation.setCPUThrottlingRate", { rate: opts.cpu });
  return cdp;
}

/** A real touch drag of 300 px over ~200 ms, then a moment of momentum. */
async function drag(cdp: CDPSession) {
  const steps = 12;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 600 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: 600 - (300 * i) / steps }] });
    await sleep(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(250);
}

/** No layer ever draws a frame of another clip (null = cream while its clip has nothing loaded). */
function expectOwnClips(samples: Sample[]) {
  for (const s of samples) {
    for (const layer of s.layers) {
      if (layer.drawn) expect(layer.drawn.clip, `v=${s.v.toFixed(1)}: clip ${layer.clip + 1} drew clip ${layer.drawn.clip + 1}`).toBe(layer.clip);
    }
  }
}

/** Largest change of the drawn frame between consecutive draws, per clip. */
function largestJump(samples: Sample[]) {
  let worst = { jump: 0, at: "" };
  for (let i = 1; i < samples.length; i++) {
    for (const layer of samples[i].layers) {
      const before = samples[i - 1].layers.find((l) => l.clip === layer.clip)?.drawn;
      if (!before || !layer.drawn) continue;
      const jump = Math.abs(layer.drawn.frame - before.frame);
      if (jump > worst.jump) worst = { jump, at: `clip ${layer.clip + 1}: frame ${before.frame + 1} → ${layer.drawn.frame + 1} at v=${samples[i].v.toFixed(1)}` };
    }
  }
  return worst;
}

const describe = (s: Sample) =>
  s.layers.map((l) => `clip ${l.clip + 1} wants ${l.frame.toFixed(1)} → ${l.drawn ? `clip ${l.drawn.clip + 1} frame ${l.drawn.frame + 1}` : "cream"}`).join(" | ");

test.describe("phone, 390×844", () => {
  test.use(PHONE);

  test("4× CPU, Fast 3G: straight to #pour, always the right clip; once loaded, a touch scroll steps ≤ 2 frames", async ({ page }) => {
    test.setTimeout(300_000);
    const cdp = await throttle(page, { network: true, cpu: 4 });
    await page.goto("/?debug", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await scrollToAnchor(page, "pour");
    await page.waitForFunction(() => (window as unknown as { __film?: Debug }).__film?.mobile === true, null, { timeout: 60_000 });
    await waitForLoaded(page, 4, 60_000);
    await sleep(5000);
    const atPour = await debug(page);
    expectOwnClips(atPour.samples);
    const pour = atPour.samples.filter((s) => s.layers.some((l) => l.clip === 2));
    expect(pour.length).toBeGreaterThan(0);
    expect(pour.at(-1)!.layers.find((l) => l.clip === 2)!.drawn).not.toBeNull();

    // Everything in, then back to the top and a smooth touch scroll through the film.
    await waitForLoaded(page, PHONE_FRAMES, 240_000);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await sleep(2000);
    const end = await filmEnd(page);
    const from = await sampleCount(page);
    for (let n = 0; n < 80 && (await page.evaluate(() => scrollY)) < end; n++) await drag(cdp);
    await sleep(3000);
    const after = await debug(page);
    const pass = after.samples.slice(from);
    expectOwnClips(pass);
    const worst = largestJump(pass);
    console.log(
      "[film] phone:",
      JSON.stringify({ firstAtPour: describe(pour[0]), lastAtPour: describe(pour.at(-1)!), loadedAtPour: atPour.loaded, draws: pass.length, decoded: after.decoded, largestJump: worst }, null, 2),
    );
    expect(pass.length).toBeGreaterThan(100);
    expect(worst.jump, worst.at).toBeLessThanOrEqual(2);
  });

  test("only the phone frames are requested, in order: every clip's 0001, every 8th frame, then the rest", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/frames/")) requested.push(r.url().split("/frames/")[1]);
    });
    await page.goto("/?debug", { waitUntil: "load" });
    await waitForLoaded(page, PHONE_FRAMES, 60_000);
    expect(requested.length).toBe(PHONE_FRAMES);
    expect(requested.every((u) => u.startsWith("v3/mobile/"))).toBe(true);
    expect(requested.slice(0, 4).sort()).toEqual(["1-grind", "2-exploded", "3-pour", "4-sip"].map((c) => `v3/mobile/${c}/0001.webp`));
    const frameNumber = (u: string) => Number(/(\d{4})\.webp$/.exec(u)![1]);
    expect(requested.slice(4, 64).every((u) => frameNumber(u) % 8 === 0)).toBe(true);
  });
});

for (const [label, device] of [
  ["390×844", PHONE],
  ["360×740", SMALL_PHONE],
] as const) {
  test.describe(`phone layout, ${label}`, () => {
    test.use(device);

    test(`each scene shows the whole frame, with the copy below it (${label})`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.goto("/?debug", { waitUntil: "load" });
      await waitForLoaded(page, PHONE_FRAMES, 60_000);
      const report: Record<string, unknown> = {};
      for (const id of ["grind", "dial-in", "pour", "sip"]) {
        await scrollToAnchor(page, id);
        await sleep(2500);
        await info.attach(`${label}-${id}.png`, { body: await page.screenshot(), contentType: "image/png" });
        if (process.env.FILM_SHOTS) await page.screenshot({ path: `${process.env.FILM_SHOTS}/${label}-${id}.png` });

        const last = (await debug(page)).samples.at(-1)!;
        const frameTop = Math.min(...last.layers.map((l) => l.rect.y));
        const frameBottom = Math.max(...last.layers.map((l) => l.rect.y + l.rect.h));
        const copy = await page.evaluate(() => {
          // Every scene's copy block (they share one column below the frame).
          const blocks = [...document.querySelectorAll("#method .scene-copy > div")].map((el) => el.getBoundingClientRect());
          return { top: Math.min(...blocks.map((r) => r.top)), bottom: Math.max(...blocks.map((r) => r.bottom)), vh: innerHeight };
        });
        report[id] = { frameTop: Math.round(frameTop), frameBottom: Math.round(frameBottom), copyTop: Math.round(copy.top), copyBottom: Math.round(copy.bottom) };
        expect(last.mobile).toBe(true);
        expect(last.layers.every((l) => l.drawn?.clip === l.clip)).toBe(true);
        // The whole frame is on screen…
        expect(frameTop).toBeGreaterThanOrEqual(0);
        expect(frameBottom).toBeLessThanOrEqual(copy.vh);
        // …and the copy sits below it, inside the viewport.
        expect(copy.top, id).toBeGreaterThanOrEqual(frameBottom);
        expect(copy.bottom, id).toBeLessThanOrEqual(copy.vh);
      }
      console.log(`[film] phone layout ${label}:`, JSON.stringify(report));
    });
  });
}

test.describe("desktop, 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("only the desktop frames are requested (192 per clip)", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/frames/")) requested.push(r.url().split("/frames/")[1]);
    });
    await page.goto("/?debug", { waitUntil: "load" });
    await waitForLoaded(page, 4 * 192, 60_000);
    expect(requested.length).toBe(4 * 192);
    expect(requested.every((u) => /^[1-4]-[a-z]+\/\d{4}\.webp$/.test(u))).toBe(true);
  });

  test("Fast 3G, straight to #pour: no layer ever draws another clip's frame", async ({ page }) => {
    test.setTimeout(120_000);
    await throttle(page, { network: true });
    await page.goto("/?debug", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await scrollToAnchor(page, "pour");
    await page.waitForFunction(() => "__film" in window, null, { timeout: 60_000 });
    await sleep(15_000);
    const f = await debug(page);
    expect(f.mobile).toBe(false);
    expect(f.samples.length).toBeGreaterThan(0);
    expectOwnClips(f.samples);
    console.log("[film] desktop at #pour on Fast 3G:", describe(f.samples[0]), "…", describe(f.samples.at(-1)!));
  });
});
