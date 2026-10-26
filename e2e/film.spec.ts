import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

/*
 * The scroll film under ?debug: Film.tsx exposes window.__film with every draw
 * (what each layer asked for and the clip/frame of the bitmap actually drawn)
 * and the live ImageBitmap counters.
 */
type Drawn = { clip: number; frame: number } | null;
type Sample = { t: number; v: number; cost: number; set: string; layers: { clip: number; frame: number; alpha: number; drawn: Drawn; blend: number }[] };
type Debug = {
  samples: Sample[];
  set: string | null;
  bitmaps: number;
  peakBitmaps: number;
  anchors: number;
  cap: number;
  tl: { spans: { from: number; to: number }[]; length: number; reduced: boolean };
};

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
/** DevTools' "Fast 3G" profile. */
const FAST_3G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024 * 0.9) / 8, uploadThroughput: (750 * 1024 * 0.9) / 8 };
const MB = 1024 * 1024;
/**
 * Sleeps on the test side. page.waitForTimeout and page.evaluate run script in the
 * page, which under 4× CPU throttling costs ~11 ms of main thread each time and
 * would show up as the site's own jank.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const film = (page: Page) => page.evaluate(() => {
  const f = (window as unknown as { __film: Debug }).__film;
  return { samples: f.samples, set: f.set, bitmaps: f.bitmaps, peakBitmaps: f.peakBitmaps, anchors: f.anchors, cap: f.cap, tl: f.tl };
});

/**
 * Chrome estimates navigator.connection.effectiveType from real traffic, browser-wide:
 * after the Fast 3G test it reads "3g" in later tests too, which (correctly) switches
 * the site to still frames. Pin it so the frame loader itself is what's under test.
 */
const FOUR_G = { effectiveType: "4g", saveData: false };
async function pinConnection(page: Page, value: { effectiveType: string; saveData: boolean }) {
  await page.addInitScript((v) => Object.defineProperty(navigator, "connection", { value: v, configurable: true }), value);
}

async function throttle(page: Page, opts: { network?: boolean; cpu?: number }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  if (opts.network) await cdp.send("Network.emulateNetworkConditions", FAST_3G);
  if (opts.cpu) await cdp.send("Emulation.setCPUThrottlingRate", { rate: opts.cpu });
  return cdp;
}

const scrollToAnchor = (page: Page, id: string) =>
  page.evaluate((anchor) => document.getElementById(anchor)!.scrollIntoView({ behavior: "instant" }), id);

const frameRequests = (urls: string[]) => urls.filter((u) => u.includes("/frames/"));

test("headers: frames are immutable, images cache for a week", async ({ request }) => {
  const frame = await request.get("/frames/v2/mobile/3-pour/0001.webp");
  expect(frame.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  const image = await request.get("/images/hero-poster.webp");
  expect(image.headers()["cache-control"]).toBe("public, max-age=604800, stale-while-revalidate=86400");
});

test.describe("phone, 390×844", () => {
  test.use(PHONE);

  test("wrong-clip regression: Fast 3G + 4× CPU, jump to #pour then #sip, every layer draws its own clip", async ({ page }, info) => {
    test.setTimeout(120_000);
    await pinConnection(page, FOUR_G);
    await throttle(page, { network: true, cpu: 4 });
    await page.goto("/?debug", { waitUntil: "domcontentloaded" });

    // Straight to #pour, before anything has loaded.
    await scrollToAnchor(page, "pour");
    await page.waitForFunction(() => "__film" in window, null, { timeout: 60_000 });
    const early = await page.evaluate(() => {
      const canvas = document.querySelector("#method canvas") as HTMLCanvasElement;
      return { canvas: canvas.style.visibility || "hidden (class)", poster: (canvas.parentElement as HTMLElement).style.backgroundImage };
    });
    await page.waitForFunction(() => (window as unknown as { __film?: Debug }).__film?.anchors === 4, null, { timeout: 60_000 });
    await page.waitForTimeout(4000);
    const atPour = await film(page);

    await scrollToAnchor(page, "sip");
    await page.waitForTimeout(10_000);
    const atSip = await film(page);

    const { samples, tl } = atSip;
    expect(atSip.set).toBe("mobile");
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      for (const layer of s.layers) {
        // The layer belongs to a clip that is playing at this position…
        const span = tl.spans[layer.clip];
        expect(s.v).toBeGreaterThanOrEqual(span.from - 0.001);
        expect(s.v).toBeLessThanOrEqual(span.to + 0.001);
        // …and draws a bitmap fetched for that same clip.
        expect(layer.drawn, `sample at v=${s.v.toFixed(1)}`).not.toBeNull();
        expect(layer.drawn!.clip, `sample at v=${s.v.toFixed(1)} asked clip ${layer.clip}`).toBe(layer.clip);
      }
    }
    expect(atSip.peakBitmaps).toBeLessThanOrEqual(atSip.cap);

    const describe = (s: Sample) => s.layers.map((l) => `clip ${l.clip + 1} wants ${l.frame.toFixed(1)} → drew clip ${l.drawn!.clip + 1} frame ${l.drawn!.frame + 1}`).join(" | ");
    const report = {
      beforeAnchors: early,
      firstDrawAtPour: describe(atPour.samples[0]),
      lastAtPour: describe(atPour.samples[atPour.samples.length - 1]),
      lastAtSip: describe(samples[samples.length - 1]),
      draws: samples.length,
      exactDraws: samples.filter((s) => s.layers.every((l) => l.drawn!.frame === Math.round(l.frame) || l.drawn!.frame === Math.floor(l.frame))).length,
      peakBitmaps: atSip.peakBitmaps,
      cap: atSip.cap,
    };
    console.log("[film] wrong-clip run:", JSON.stringify(report, null, 2));
    await info.attach("wrong-clip.json", { body: JSON.stringify({ report, samples }, null, 2), contentType: "application/json" });
  });

  test("weight: before any scroll the home page transfers ≤ 1.5 MB (poster + wave 0 + wave 1 + JS/CSS)", async ({ page }) => {
    await pinConnection(page, FOUR_G);
    // The network log: every finished request's transferred (encoded) body plus headers.
    const urls: string[] = [];
    let bytes = 0;
    const byType: Record<string, number> = {};
    page.on("requestfinished", async (r) => {
      const url = r.url();
      if (url.startsWith("data:")) return;
      const { responseBodySize, responseHeadersSize } = await r.sizes();
      const size = responseBodySize + responseHeadersSize;
      urls.push(url);
      bytes += size;
      const type = url.includes("/frames/") ? "frames" : url.includes("/_next/static/") ? "js/css/fonts" : url.includes("/images/") || url.includes("/_next/image") ? "images" : "document/other";
      byType[type] = (byType[type] ?? 0) + size;
    });

    await page.goto("/?debug", { waitUntil: "load" });
    // Waves 0 and 1, then quiet: no fill until the visitor scrolls.
    await expect.poll(() => frameRequests(urls).length, { timeout: 30_000 }).toBe(64);
    await page.waitForTimeout(3000);
    const frames = frameRequests(urls);
    expect(frames.length).toBe(64);
    expect(frames.every((u) => u.includes("/frames/v2/mobile/"))).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);

    const kb = Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, `${(v / 1024).toFixed(0)} KB`]));
    console.log(`[film] mobile home before scrolling: ${(bytes / MB).toFixed(2)} MB over ${urls.length} requests`, JSON.stringify(kb));
    expect(bytes).toBeLessThanOrEqual(1.5 * MB);
  });

  test("data saver: still frames only (one per clip), short timeline", async ({ page }) => {
    await pinConnection(page, { effectiveType: "4g", saveData: true });
    const requested: string[] = [];
    page.on("request", (r) => requested.push(r.url()));
    await page.goto("/?debug", { waitUntil: "load" });
    await page.waitForFunction(() => (window as unknown as { __film?: Debug }).__film?.anchors === 4);
    await scrollToAnchor(page, "pour");
    await page.waitForTimeout(1500);
    const f = await film(page);
    expect(f.tl.reduced).toBe(true);
    expect(frameRequests(requested).map((u) => u.split("/frames/v2/")[1]).sort()).toEqual([
      "mobile/1-grind/0120.webp",
      "mobile/2-exploded/0060.webp",
      "mobile/3-pour/0060.webp",
      "mobile/4-sip/0060.webp",
    ]);
  });
});

/** Records rAF intervals in the page while `run` scrolls, and returns their p95 (ms). */
async function p95FrameTime(page: Page, run: () => Promise<void>) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __recording: boolean };
    w.__frames = [];
    w.__recording = true;
    let last = performance.now();
    const tick = (now: number) => {
      w.__frames.push(now - last);
      last = now;
      if (w.__recording) requestAnimationFrame(tick);
    };
    requestAnimationFrame((now) => {
      last = now;
      requestAnimationFrame(tick);
    });
  });
  await run();
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __recording: boolean };
    w.__recording = false;
    return w.__frames;
  });
  const sorted = [...frames].sort((a, b) => a - b);
  return { p95: sorted[Math.floor(sorted.length * 0.95)], median: sorted[Math.floor(sorted.length / 2)], frames: frames.length };
}

const filmEnd = (page: Page) => page.evaluate(() => {
  const el = document.getElementById("method")!;
  return el.offsetTop + el.offsetHeight - innerHeight;
});

test.describe("smoothness", () => {
  test.describe("phone", () => {
    test.use(PHONE);

    test("touch scroll through the whole film at 4× CPU keeps p95 frame time ≤ 20 ms", async ({ page }) => {
      test.setTimeout(120_000);
      await pinConnection(page, FOUR_G);
      await page.goto("/?debug", { waitUntil: "load" });
      await page.waitForFunction(() => (window as unknown as { __film?: Debug }).__film?.anchors === 4);
      const cdp = await throttle(page, { cpu: 4 });
      const end = await filmEnd(page);
      // Native touch scrolling: real touch drags of 400 px (~200 ms each), with momentum in between.
      const drag = async () => {
        const steps = 12;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 650 }] });
        for (let i = 1; i <= steps; i++) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: 650 - (400 * i) / steps }] });
          await sleep(16);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await sleep(150);
      };
      const result = await p95FrameTime(page, async () => {
        // Momentum carries each drag further than 400 px, so this is more than enough.
        for (let n = 0; n < Math.ceil(end / 400); n++) await drag();
        await sleep(500);
      });
      expect(await page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(end);
      const f = await film(page);
      console.log("[film] phone touch scroll:", JSON.stringify({ ...result, peakBitmaps: f.peakBitmaps, bitmaps: f.bitmaps, anchors: f.anchors, cap: f.cap, set: f.set, draws: f.samples.length }));
      expect(f.peakBitmaps).toBeLessThanOrEqual(f.cap);
      expect(result.p95).toBeLessThanOrEqual(20);
    });
  });

  test.describe("desktop", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("wheel scroll through the whole film at 4× CPU keeps p95 frame time ≤ 20 ms", async ({ page }) => {
      test.setTimeout(120_000);
      await pinConnection(page, FOUR_G);
      await page.goto("/?debug", { waitUntil: "load" });
      await page.waitForFunction(() => (window as unknown as { __film?: Debug }).__film?.anchors === 4);
      await throttle(page, { cpu: 4 });
      const end = await filmEnd(page);
      await page.mouse.move(720, 450);
      const result = await p95FrameTime(page, async () => {
        for (let n = 0; n < Math.ceil(end / 100) + 20; n++) {
          await page.mouse.wheel(0, 100);
          await sleep(30);
        }
        await sleep(2500);
      });
      expect(await page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(end);
      const f = await film(page);
      console.log("[film] desktop wheel scroll:", JSON.stringify({ ...result, peakBitmaps: f.peakBitmaps, bitmaps: f.bitmaps, anchors: f.anchors, cap: f.cap, set: f.set, draws: f.samples.length }));
      expect(f.set).toBe("desktop");
      expect(f.peakBitmaps).toBeLessThanOrEqual(f.cap);
      expect(result.p95).toBeLessThanOrEqual(20);
    });
  });
});

test.describe("idle", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("no rAF loop runs while nothing moves (film settled, no card revealed)", async ({ page }) => {
    await pinConnection(page, FOUR_G);
    await page.addInitScript(() => {
      const w = window as unknown as { __rafCalls: number };
      w.__rafCalls = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        w.__rafCalls++;
        return raf(cb);
      };
    });
    await page.goto("/?debug", { waitUntil: "load" });
    await page.waitForFunction(() => (window as unknown as { __film?: Debug }).__film?.anchors === 4);
    // Wheel into the film and let Lenis and the film settle.
    await page.mouse.move(720, 450);
    for (let n = 0; n < 10; n++) {
      await page.mouse.wheel(0, 100);
      await sleep(30);
    }
    await sleep(3000);
    const before = await page.evaluate(() => (window as unknown as { __rafCalls: number }).__rafCalls);
    await sleep(2000);
    const after = await page.evaluate(() => (window as unknown as { __rafCalls: number }).__rafCalls);
    expect(after - before).toBe(0);
  });
});

test.describe("anchors", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("an in-page link still glides to its step with Lenis driven on demand", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.getByRole("link", { name: "Start brewing" }).click();
    await sleep(300);
    const midway = await page.evaluate(() => scrollY);
    await sleep(2000);
    const target = await page.evaluate(() => document.getElementById("dial-in")!.getBoundingClientRect().top + scrollY);
    const landed = await page.evaluate(() => scrollY);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(target - 10); // still travelling, not a jump
    expect(Math.abs(landed - target)).toBeLessThanOrEqual(2);
  });
});
