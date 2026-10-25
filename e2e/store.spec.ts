import { addSageMorning, expect, fillCard, fillShippingAndDelivery, savedOrders, test } from "./helpers";

test("1. on a 375px viewport, the home product carousel scrolls to the last card", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const carousel = page.getByRole("region", { name: "Products" });
  await carousel.scrollIntoViewIfNeeded();
  const cards = carousel.getByRole("article");
  await expect(cards).toHaveCount(10);

  // Keyboard: focus the region and press Right until the end.
  await carousel.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  await expect(cards.last()).toBeInViewport({ ratio: 0.9 });
  await expect
    .poll(() => carousel.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft))
    .toBeLessThanOrEqual(2);
});

test("2. add from the home +, the drawer opens, change qty, go to checkout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const add = page.getByRole("button", { name: "Add Sage Morning, 250 g, to cart" });
  await add.scrollIntoViewIfNeeded();
  await add.click();

  const drawer = page.getByRole("dialog", { name: /Your cart/ });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Sage Morning");
  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer.getByRole("group", { name: /Quantity of Sage Morning/ })).toContainText("2");
  await expect(drawer).toContainText("$36.00");
  await expect(page.getByRole("button", { name: "Cart, 2 items" })).toBeVisible();

  await drawer.getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Contact & shipping" })).toBeVisible();
});

test("3. checkout with the test card shows the right total and empties the cart", async ({ page }) => {
  await addSageMorning(page);
  await page.goto("/checkout");
  await fillShippingAndDelivery(page);
  await fillCard(page, "4242 4242 4242 4242");
  await page.getByRole("button", { name: /^Place order/ }).click();
  await expect(page.getByRole("button", { name: /Processing/ })).toBeVisible();

  await expect(page).toHaveURL(/\/order\/GP-[A-Z0-9]{6}$/);
  await expect(page.getByRole("heading", { name: "Thank you, Layla!" })).toBeVisible();
  // $18.00 + $5.00 standard shipping (under $40).
  const totals = page.locator('dl[aria-label="Order totals"]');
  await expect(totals).toContainText("$18.00");
  await expect(totals.locator("div").filter({ hasText: /^Total/ }).last()).toContainText("$23.00");
  await expect(page.getByText("Demo test card (no charge)")).toBeVisible();

  await expect(page.getByRole("button", { name: "Cart, empty" })).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("4. a non-test card shows the demo message and places no order", async ({ page }) => {
  await addSageMorning(page);
  await page.goto("/checkout");
  await fillShippingAndDelivery(page);
  await fillCard(page, "4000 0000 0000 0002");
  await page.getByRole("button", { name: /^Place order/ }).click();

  await expect(page.getByText("This is a demo store: please use the test card 4242 4242 4242 4242.")).toBeVisible();
  await expect(page.getByLabel("Card number", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.waitForTimeout(2000); // longer than the processing delay
  await expect(page).toHaveURL(/\/checkout$/);
  expect(await savedOrders(page)).toBe(0);
  await expect(page.getByRole("button", { name: "Cart, 1 item" })).toBeVisible();
});

test("5. cash on delivery places an order", async ({ page }) => {
  await addSageMorning(page);
  await page.goto("/checkout");
  await fillShippingAndDelivery(page);
  await page.getByRole("radio", { name: "Cash on delivery" }).check();
  await expect(page.getByLabel("Card number", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Place order/ }).click();

  await expect(page).toHaveURL(/\/order\/GP-[A-Z0-9]{6}$/);
  await expect(page.getByRole("main").getByText("Cash on delivery", { exact: true })).toBeVisible();
  expect(await savedOrders(page)).toBe(1);
});

test("6. the promo code WELCOME10 applies 10% off", async ({ page }) => {
  await addSageMorning(page);
  await page.goto("/cart");
  await page.getByLabel("Promo code", { exact: true }).fill("NOPE");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("That code isn't valid. Try WELCOME10 for 10% off.")).toBeVisible();

  await page.getByLabel("Promo code", { exact: true }).fill("welcome10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("status").filter({ hasText: "WELCOME10" })).toContainText("applied");
  // $18.00 − $1.80 + $5.00 standard shipping = $21.20
  await expect(page.getByText("−$1.80")).toBeVisible();
  await expect(page.locator("main dl div").filter({ hasText: /^Total/ }).last()).toContainText("$21.20");
});
