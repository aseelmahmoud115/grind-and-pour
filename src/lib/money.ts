/** All arithmetic is done in integer cents; dollars only appear at the edges. */
export const toCents = (dollars: number) => Math.round(dollars * 100);

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const formatCents = (cents: number) => usd.format(cents / 100);

export const FREE_SHIPPING_CENTS = toCents(40);
export const PROMO_CODES: Record<string, { label: string; percentOff: number }> = {
  WELCOME10: { label: "WELCOME10 · 10% off", percentOff: 10 },
};

export const DELIVERY = {
  standard: { label: "Standard", price: toCents(5), days: "3–5 business days", minDays: 3, maxDays: 5 },
  express: { label: "Express", price: toCents(12), days: "1–2 business days", minDays: 1, maxDays: 2 },
} as const;
export type DeliveryMethod = keyof typeof DELIVERY;

export function discountCents(subtotal: number, promo: string | null) {
  const code = promo ? PROMO_CODES[promo] : undefined;
  return code ? Math.round((subtotal * code.percentOff) / 100) : 0;
}

/** Standard is free from $40 of merchandise (before discounts); express always costs. */
export function shippingCents(subtotal: number, method: DeliveryMethod) {
  if (method === "standard" && subtotal >= FREE_SHIPPING_CENTS) return 0;
  return DELIVERY[method].price;
}

export function totals(subtotal: number, promo: string | null, method: DeliveryMethod | null) {
  const discount = discountCents(subtotal, promo);
  const shipping = method ? shippingCents(subtotal, method) : 0;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}
