import { expect, test, type Page } from "@playwright/test";

export { expect, test };

/** Adds the 250 g Sage Morning ($18.00) from its product page. */
export async function addSageMorning(page: Page) {
  await page.goto("/product/sage-morning");
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(page.getByRole("dialog", { name: /Your cart/ })).toBeVisible();
}

/** Steps 1 and 2 of checkout (standard delivery). */
export async function fillShippingAndDelivery(page: Page) {
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Full name", { exact: true }).fill("Layla Hassan");
  await page.getByLabel("Phone", { exact: true }).fill("+20 100 123 4567");
  await page.getByLabel("Country", { exact: true }).selectOption("Egypt");
  await page.getByLabel("City", { exact: true }).fill("Cairo");
  await page.getByLabel("Address", { exact: true }).fill("12 Tahrir Street, Downtown");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await expect(page.getByRole("heading", { name: "Delivery" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment (demo)" })).toBeVisible();
}

export async function fillCard(page: Page, number: string) {
  await page.getByLabel("Card number", { exact: true }).fill(number);
  await page.getByLabel("Name on card", { exact: true }).fill("Layla Hassan");
  await page.getByLabel("Expiry (MM/YY)", { exact: true }).fill("12/30");
  await page.getByLabel("CVC", { exact: true }).fill("123");
}

/** Number of demo orders saved in localStorage. */
export const savedOrders = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem("gp-orders");
    return raw ? (JSON.parse(raw).state.orders.length as number) : 0;
  });
