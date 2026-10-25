import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

/** A real touch drag (touchStart → moves → touchEnd) through the Chrome DevTools Protocol. */
async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  const steps = 12;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(600); // let momentum / snapping settle
}

/** Scrolls the home carousel into the middle of the screen and returns it. */
async function homeCarousel(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const carousel = page.getByRole("region", { name: "Products" });
  await carousel.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 160, behavior: "instant" }));
  await page.waitForTimeout(500);
  return carousel;
}

test.describe("touch, 375px", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("a vertical swipe that starts on a card scrolls the page", async ({ page }) => {
    const carousel = await homeCarousel(page);
    const box = (await carousel.boundingBox())!;
    const before = await page.evaluate(() => scrollY);
    const startX = box.x + box.width * 0.4;
    const startY = box.y + box.height * 0.6;
    await swipe(page, { x: startX, y: startY }, { x: startX, y: startY - 320 });
    const after = await page.evaluate(() => scrollY);
    expect(after - before).toBeGreaterThan(150);
    expect(await carousel.evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test("a horizontal swipe on the cards scrolls the carousel, not the page", async ({ page }) => {
    const carousel = await homeCarousel(page);
    const box = (await carousel.boundingBox())!;
    const before = await page.evaluate(() => scrollY);
    const y = box.y + box.height * 0.45;
    await swipe(page, { x: box.x + box.width * 0.8, y }, { x: box.x + box.width * 0.15, y });
    expect(await carousel.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(20);
  });
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
]) {
  test(`arrow buttons reach the last card, and no dots are rendered (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // Below lg the home carousel holds every coffee; on desktop use the product page's related carousel.
    const desktop = viewport.width >= 1024;
    if (desktop) await page.goto("/product/sage-morning", { waitUntil: "domcontentloaded" });
    const carousel = desktop ? page.getByRole("region", { name: "Related products" }) : await homeCarousel(page);
    await carousel.scrollIntoViewIfNeeded();
    const root = page.locator("[data-carousel]").filter({ has: carousel });
    const next = root.getByRole("button", { name: "Next products" });
    const prev = root.getByRole("button", { name: "Previous products" });

    await expect(prev).toHaveAttribute("aria-disabled", "true");
    for (let i = 0; i < 12 && (await next.getAttribute("aria-disabled")) !== "true"; i++) {
      await next.click();
      await page.waitForTimeout(450);
    }
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await expect(prev).toHaveAttribute("aria-disabled", "false");
    await expect(carousel.getByRole("article").last()).toBeInViewport({ ratio: 0.9 });
    const box = (await next.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    // No dot indicators: nothing small and visible in the carousel outside the scroller and its buttons.
    const dots = await root.evaluate((el) =>
      [...el.querySelectorAll("*")].filter((n) => {
        if (n.closest('[role="region"]') || n.closest("button")) return false;
        const r = n.getBoundingClientRect();
        return r.width > 0 && r.width <= 12 && r.height > 0 && r.height <= 12 && getComputedStyle(n).visibility !== "hidden";
      }).length,
    );
    expect(dots).toBe(0);
  });
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
]) {
  test(`hero eyebrow sits below the navbar at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    const nav = (await page.getByRole("banner").boundingBox())!;
    const eyebrow = (await page.getByText("01 — Grind", { exact: true }).boundingBox())!;
    const intersects =
      eyebrow.x < nav.x + nav.width && eyebrow.x + eyebrow.width > nav.x && eyebrow.y < nav.y + nav.height && eyebrow.y + eyebrow.height > nav.y;
    expect(intersects, `eyebrow ${JSON.stringify(eyebrow)} vs navbar ${JSON.stringify(nav)}`).toBe(false);
    expect(eyebrow.y).toBeGreaterThanOrEqual(nav.y + nav.height);
    // …and the hero's call to action still fits above the fold.
    const cta = (await page.getByRole("link", { name: "Start brewing" }).boundingBox())!;
    expect(cta.y + cta.height).toBeLessThanOrEqual(viewport.height);
  });
}
