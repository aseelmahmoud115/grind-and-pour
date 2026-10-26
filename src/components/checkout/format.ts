/*
 * Checkout constants and input formatting, kept apart from the zod schemas so the
 * form renders without zod (schemas.ts loads on the first validation).
 */
import type { CardValues } from "./schemas";

export const COUNTRIES = ["Egypt", "Palestine", "Jordan", "Saudi Arabia", "UAE", "Other"] as const;

/** The only card the demo accepts. */
export const TEST_CARD = "4242424242424242";
export const DEMO_CARD_MESSAGE = "This is a demo store: please use the test card 4242 4242 4242 4242.";

export const EMPTY_CARD: CardValues = { demoNumber: "", demoName: "", demoExpiry: "", demoCvc: "" };

/** "4242424242424242" → "4242 4242 4242 4242" while typing. */
export const spaceCardNumber = (raw: string) =>
  raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

/** "1229" → "12/29" while typing. */
export const formatExpiry = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
