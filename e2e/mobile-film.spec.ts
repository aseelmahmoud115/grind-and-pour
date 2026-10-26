import type { CDPSession, Page } from "@playwright/test";
import { expect, test } from "./helpers";

/*
 * Desktop: the scroll film under ?debug. Film.tsx exposes window.__film with every
 * draw (what each layer asked for, the clip/frame of the image drawn for it, or null
 * for cream, and the frame's rect) and how many frames have loaded.
 *
 * Phones: no frames. PhoneFilm.tsx plays one video per scene and, under ?debug,
 * exposes window.__phoneFilm: the scene in view and a log of every scene change,
 * src swap, preload and playback event (with the video's src at that moment).
 */
type Layer = { clip: number; frame: number; alpha: number; drawn: { clip: number; frame: number } | null; rect: { y: number; h: number } };
type Sample = { t: number; v: number; layers: Layer[] };
type Debug = { samples: Sample[]; mobile: boolean; loaded: number };
type PhoneEvent = { t: number; type: string; scene: number; src: string };
type PhoneDebug = { scene: number; events: PhoneEvent[] };

// A phone-sized screen too: the project's Desktop Chrome profile has a 1920 × 1080 screen, which makes
// Chrome style the first paint as a landscape page (and fetch the desktop poster) on a portrait viewport.
const PHONE = { viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const SMALL_PHONE = { viewport: { width: 360, height: 740 }, screen: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const SCENES = ["1-grind", "2-exploded", "3-pour", "4-sip"];
const ANCHORS = ["grind", "dial-in", "pour", "sip"];
const videoOf = (scene: number) => `/videos/mobile/${SCENES[scene]}.mp4`;
/** DevTools' "Fast 3G" profile. */
const FAST_3G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024 * 0.9) / 8, uploadThroughput: (750 * 1024 * 0.9) / 8 };

/**
 * Sleeps on the test side: page.waitForTimeout runs script in the page, which under
 * 4× CPU throttling would show up as the site's own work.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const debug = (page: Page) => page.evaluate(() => {
  const f = (window as unknown as { __film: Debug }).__film;
  return { samples: f.samples, mobile: f.mobile, loaded: f.loaded };
});
const waitForLoaded = (page: Page, count: number, timeout: number) =>
  page.waitForFunction((n) => ((window as unknown as { __film?: Debug }).__film?.loaded ?? 0) >= n, count, { timeout, polling: 500 });
const scrollToAnchor = (page: Page, id: string) =>
  page.evaluate((anchor) => document.getElementById(anchor)!.scrollIntoView({ behavior: "instant" }), id);

const phoneDebug = (page: Page) => page.evaluate(() => {
  const f = (window as unknown as { __phoneFilm: PhoneDebug }).__phoneFilm;
  return { scene: f.scene, events: f.events };
});
/** What the phone stage shows right now. */
const phoneState = (page: Page) => page.evaluate(() => {
  const video = document.querySelector<HTMLVideoElement>("#method video:not(.hidden)")!;
  const cover = video.nextElementSibling as HTMLImageElement;
  const r = video.getBoundingClientRect();
  return {
    scene: (window as unknown as { __phoneFilm: PhoneDebug }).__phoneFilm.scene,
    src: video.getAttribute("src"),
    ended: video.ended,
    paused: video.paused,
    currentTime: video.currentTime,
    duration: video.duration,
    controls: video.controls,
    poster: video.getAttribute("poster"),
    cover: { src: new URL(cover.src).pathname, opacity: Number(getComputedStyle(cover).opacity) },
    rect: { top: r.top, bottom: r.bottom },
  };
});
const waitForPhoneEvent = (page: Page, type: string, scene: number, timeout: number) =>
  page.waitForFunction(
    ([t, s]) => (window as unknown as { __phoneFilm?: PhoneDebug }).__phoneFilm?.events.some((e) => e.type === t && e.scene === s),
    [type, scene] as const,
    { timeout, polling: 250 },
  );

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

/**
 * Per-frame timing while scrolling: for every animation frame, the gap since the last
 * one and the main thread's work for it (from rAF to a task queued right after it,
 * i.e. scripts, style, layout and paint of that frame).
 */
const startFrameProbe = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __frames: { gaps: number[]; work: number[] }; __probe: boolean };
  w.__frames = { gaps: [], work: [] };
  w.__probe = true;
  const channel = new MessageChannel();
  let started = 0;
  let last = 0;
  channel.port1.onmessage = () => w.__frames.work.push(performance.now() - started);
  const tick = (now: number) => {
    if (!w.__probe) return;
    if (last) w.__frames.gaps.push(now - last);
    last = now;
    started = performance.now();
    channel.port2.postMessage(0);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const stopFrameProbe = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __frames: { gaps: number[]; work: number[] }; __probe: boolean };
  w.__probe = false;
  return w.__frames;
});
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? NaN;
};
const round = (n: number) => Math.round(n * 10) / 10;

/** Every swap and every `playing` is of the video of the scene in view at that moment. */
function expectOwnVideos(events: PhoneEvent[]) {
  for (const e of events) {
    if (e.type === "swap" || e.type === "playing") expect(e.src, `${e.type} in scene ${e.scene + 1}`).toBe(videoOf(e.scene));
  }
}

/** No layer ever draws a frame of another clip (null = cream while its clip has nothing loaded). */
function expectOwnClips(samples: Sample[]) {
  for (const s of samples) {
    for (const layer of s.layers) {
      if (layer.drawn) expect(layer.drawn.clip, `v=${s.v.toFixed(1)}: clip ${layer.clip + 1} drew clip ${layer.drawn.clip + 1}`).toBe(layer.clip);
    }
  }
}

const describe = (s: Sample) =>
  s.layers.map((l) => `clip ${l.clip + 1} wants ${l.frame.toFixed(1)} → ${l.drawn ? `clip ${l.drawn.clip + 1} frame ${l.drawn.frame + 1}` : "cream"}`).join(" | ");

test.describe("phone, 390×844", () => {
  test.use(PHONE);

  test("4× CPU, touch scroll: each scene's video plays once from the start and holds its last frame", async ({ page }) => {
    test.setTimeout(240_000);
    const frameRequests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/frames/")) frameRequests.push(r.url());
    });
    const cdp = await throttle(page, { cpu: 4 });
    await page.goto("/?debug", { waitUntil: "load" });
    await page.waitForFunction(() => "__phoneFilm" in window, null, { timeout: 30_000 });
    expect(await page.evaluate(() => "__film" in window && (window as unknown as { __film: Debug }).__film.mobile)).toBe(true);
    // No canvas, no frames.
    expect(await page.locator("#method canvas").count()).toBe(0);

    const report: Record<string, unknown> = {};
    const gaps: number[] = [];
    const work: number[] = [];
    for (let scene = 0; scene < SCENES.length; scene++) {
      // Touch-scroll into the scene, measuring every frame meanwhile.
      if (scene > 0) {
        await startFrameProbe(page);
        for (let n = 0; n < 40 && (await phoneDebug(page)).scene < scene; n++) await drag(cdp);
        const frames = await stopFrameProbe(page);
        gaps.push(...frames.gaps);
        work.push(...frames.work);
      }
      expect((await phoneDebug(page)).scene).toBe(scene);
      // Plays (from the start), ends, and holds its last frame.
      await waitForPhoneEvent(page, "playing", scene, 30_000);
      await waitForPhoneEvent(page, "ended", scene, 30_000);
      await sleep(1000);
      const state = await phoneState(page);
      report[SCENES[scene]] = { currentTime: round(state.currentTime), duration: round(state.duration) };
      expect(state.src).toBe(videoOf(scene));
      expect(state.ended).toBe(true);
      expect(state.currentTime).toBeCloseTo(state.duration, 1);
      expect(state.cover.opacity).toBe(0);
      expect(state.controls).toBe(false);
    }

    // Back up into scene 3: it plays again from the start.
    const before = (await phoneDebug(page)).events.length;
    await page.evaluate(() => scrollBy({ top: -0.9 * innerHeight * 1.3, behavior: "instant" }));
    await page.waitForFunction(
      (n) => (window as unknown as { __phoneFilm: PhoneDebug }).__phoneFilm.events.slice(n).some((e) => e.type === "playing" && e.scene === 2),
      before,
      { timeout: 30_000 },
    );
    const replay = (await phoneDebug(page)).events.slice(before);
    const swap = replay.find((e) => e.type === "swap");
    expect(swap?.src).toBe(videoOf(2));

    const { events } = await phoneDebug(page);
    expectOwnVideos(events);
    // Each scene played once on the way down: no loop.
    for (let scene = 0; scene < SCENES.length; scene++) {
      expect(events.filter((e) => e.type === "ended" && e.scene === scene && e.t < (swap?.t ?? Infinity)).length).toBe(1);
    }
    expect(frameRequests).toEqual([]);

    const timing = {
      frames: gaps.length,
      gapP50: round(percentile(gaps, 50)),
      gapP95: round(percentile(gaps, 95)),
      workP50: round(percentile(work, 50)),
      workP95: round(percentile(work, 95)),
      workMax: round(Math.max(...work)),
    };
    console.log("[film] phone videos:", JSON.stringify({ report, timing, events: events.map((e) => `${e.type}:${e.scene + 1}`).join(" ") }, null, 2));
    expect(timing.workP95).toBeLessThan(16.7);
  });

  test("first load: the poster, the first video and the JS/CSS only", async ({ page }) => {
    const requests: { url: string; type: string; bytes: number }[] = [];
    page.on("requestfinished", async (r) => {
      const sizes = await r.sizes().catch(() => null);
      requests.push({ url: new URL(r.url()).pathname, type: r.resourceType(), bytes: sizes ? sizes.responseBodySize + sizes.responseHeadersSize : 0 });
    });
    await page.goto("/?debug", { waitUntil: "load" });
    await waitForPhoneEvent(page, "playing", 0, 30_000);
    await sleep(4000);
    const urls = requests.map((r) => r.url);
    const media = urls.filter((u) => /\.(mp4|webp|png|jpe?g|avif)$/.test(u));
    const total = requests.reduce((sum, r) => sum + r.bytes, 0);
    const byType: Record<string, number> = {};
    for (const r of requests) byType[r.type] = (byType[r.type] ?? 0) + r.bytes;
    console.log("[film] phone first load:", JSON.stringify({ totalKB: Math.round(total / 1024), byTypeKB: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])), requests: requests.length, media }, null, 2));
    expect(urls.some((u) => u.includes("/frames/"))).toBe(false);
    expect(new Set(media)).toEqual(new Set(["/videos/mobile/1-grind-poster.webp", "/videos/mobile/1-grind.mp4"]));
  });

  test("autoplay refused: the poster stays, with no controls or play button", async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("Not allowed", "NotAllowedError"));
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?debug", { waitUntil: "load" });
    await waitForPhoneEvent(page, "blocked", 0, 30_000);
    await scrollToAnchor(page, "pour");
    await waitForPhoneEvent(page, "blocked", 2, 30_000);
    await sleep(800);
    const state = await phoneState(page);
    expect(state.cover).toEqual({ src: "/videos/mobile/3-pour-poster.webp", opacity: 1 });
    expect(state.controls).toBe(false);
    expect(await page.locator("#method button").count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test("reduced motion: posters only, no video is loaded or played", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const videos: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith(".mp4")) videos.push(r.url());
    });
    await page.goto("/?debug", { waitUntil: "load" });
    await page.waitForFunction(() => "__phoneFilm" in window);
    for (const [scene, id] of ANCHORS.entries()) {
      await scrollToAnchor(page, id);
      await sleep(800);
      const state = await phoneState(page);
      expect(state.scene).toBe(scene);
      expect(state.src).toBeNull();
      expect(state.cover).toEqual({ src: `/videos/mobile/${SCENES[scene]}-poster.webp`, opacity: 1 });
    }
    expect((await phoneDebug(page)).events.filter((e) => e.type === "playing")).toEqual([]);
    expect(videos).toEqual([]);
  });
});

for (const [label, device] of [
  ["390×844", PHONE],
  ["360×740", SMALL_PHONE],
] as const) {
  test.describe(`phone layout, ${label}`, () => {
    test.use(device);

    test(`each scene shows the whole video, with the copy below it (${label})`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.goto("/?debug", { waitUntil: "load" });
      await page.waitForFunction(() => "__phoneFilm" in window);
      const report: Record<string, unknown> = {};
      for (const [scene, id] of ANCHORS.entries()) {
        await scrollToAnchor(page, id);
        await waitForPhoneEvent(page, "playing", scene, 30_000);
        await sleep(1500);
        await info.attach(`${label}-${id}.png`, { body: await page.screenshot(), contentType: "image/png" });
        if (process.env.FILM_SHOTS) await page.screenshot({ path: `${process.env.FILM_SHOTS}/${label}-${id}.png` });

        const state = await phoneState(page);
        const copy = await page.evaluate(() => {
          // Every scene's copy block (they share one column below the video).
          const blocks = [...document.querySelectorAll("#method .scene-copy > div")].map((el) => el.getBoundingClientRect());
          return { top: Math.min(...blocks.map((r) => r.top)), bottom: Math.max(...blocks.map((r) => r.bottom)), vh: innerHeight };
        });
        report[id] = { videoTop: Math.round(state.rect.top), videoBottom: Math.round(state.rect.bottom), copyTop: Math.round(copy.top), copyBottom: Math.round(copy.bottom) };
        expect(state.scene).toBe(scene);
        expect(state.src).toBe(videoOf(scene));
        // The whole video is on screen…
        expect(state.rect.top).toBeGreaterThanOrEqual(0);
        expect(state.rect.bottom).toBeLessThanOrEqual(copy.vh);
        // …and the copy sits below it, inside the viewport.
        expect(copy.top, id).toBeGreaterThanOrEqual(state.rect.bottom);
        expect(copy.bottom, id).toBeLessThanOrEqual(copy.vh);
      }
      console.log(`[film] phone layout ${label}:`, JSON.stringify(report));
    });
  });
}

test.describe("desktop, 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("only the desktop frames are requested (192 per clip), and no video", async ({ page }) => {
    const requested: string[] = [];
    const videos: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/frames/")) requested.push(r.url().split("/frames/")[1]);
      if (r.url().includes("/videos/")) videos.push(r.url());
    });
    await page.goto("/?debug", { waitUntil: "load" });
    await waitForLoaded(page, 4 * 192, 60_000);
    expect(requested.length).toBe(4 * 192);
    expect(requested.every((u) => /^[1-4]-[a-z]+\/\d{4}\.webp$/.test(u))).toBe(true);
    expect(videos).toEqual([]);
    expect(await page.locator("#method video").count()).toBe(0);
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
