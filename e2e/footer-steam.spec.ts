import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

async function newsletterBoxes(page: Page) {
  await page.goto("/faq", { waitUntil: "domcontentloaded" });
  const input = page.getByRole("textbox", { name: "Email address" });
  await input.scrollIntoViewIfNeeded();
  const button = page.getByRole("button", { name: "Subscribe" });
  return { input: (await input.boundingBox())!, button: (await button.boundingBox())! };
}

test("newsletter: input and button on one row with a 12px gap at 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { input, button } = await newsletterBoxes(page);
  expect(input.height).toBe(48);
  expect(button.height).toBe(48);
  expect(Math.abs(input.y - button.y)).toBeLessThanOrEqual(1); // same row, centred
  expect(button.x - (input.x + input.width)).toBeCloseTo(12, 0); // visible gap, not touching
  expect(input.width).toBeLessThanOrEqual(421);
});

test("newsletter: stacked with a full-width button at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const { input, button } = await newsletterBoxes(page);
  expect(button.y).toBeGreaterThanOrEqual(input.y + input.height);
  expect(Math.round(button.width)).toBe(Math.round(input.width));
});

test("footer: real contact links and the four social icons", async ({ page }) => {
  await page.goto("/faq", { waitUntil: "domcontentloaded" });
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "aseel.alqedra2004@gmail.com" })).toHaveAttribute("href", "mailto:aseel.alqedra2004@gmail.com");
  await expect(footer.getByRole("link", { name: "aseel-alqedra.vercel.app" })).toHaveAttribute("target", "_blank");
  await expect(footer).not.toContainText("Visuals generated with AI");
  const socials = footer.getByRole("link", { name: /^(LinkedIn|GitHub|Facebook|YouTube)$/ });
  await expect(socials).toHaveCount(4);
  await expect(footer.getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/in/aseel-al-qedra");
  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute("target", "_blank");
});

test("steam: no canvas until a card is revealed; it appears on hover and is removed after leaving", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/shop", { waitUntil: "networkidle" });
  await expect(page.locator("canvas[data-steam]")).toHaveCount(0);

  const image = page.getByRole("article").first().locator('[style*="perspective"]').first();
  await image.scrollIntoViewIfNeeded();
  const box = (await image.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await expect(page.locator("canvas[data-steam]")).toHaveCount(1);

  // Leave: spawning stops, live puffs finish (≤ 3.6 s), then the canvas and its loop are gone.
  await page.mouse.move(5, 5, { steps: 3 });
  await expect(page.locator("canvas[data-steam]")).toHaveCount(0, { timeout: 6000 });
});
