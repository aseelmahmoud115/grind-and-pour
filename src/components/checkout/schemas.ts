import { z } from "zod";

export const COUNTRIES = ["Egypt", "Palestine", "Jordan", "Saudi Arabia", "UAE", "Other"] as const;

export const shippingSchema = z.object({
  email: z.email("Enter a valid email address, like name@example.com."),
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a phone number with at least 7 digits, e.g. +20 100 123 4567."),
  country: z.enum(COUNTRIES, { error: "Choose a country." }),
  city: z.string().trim().min(2, "Enter your city."),
  address: z.string().trim().min(5, "Enter your street address."),
  postalCode: z.string().trim().max(12, "Postal codes are 12 characters or fewer.").optional(),
});
export type ShippingValues = z.infer<typeof shippingSchema>;

/** The only card the demo accepts. */
export const TEST_CARD = "4242424242424242";
export const DEMO_CARD_MESSAGE = "This is a demo store: please use the test card 4242 4242 4242 4242.";

function expiryInFuture(value: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= new Date();
}

/** Demo card fields. Values are validated in memory only and cleared on submit. */
export const cardSchema = z.object({
  demoNumber: z.string().refine((v) => v.replace(/\s/g, "") === TEST_CARD, DEMO_CARD_MESSAGE),
  demoName: z.string().trim().min(2, "Enter the name on the card."),
  demoExpiry: z.string().refine(expiryInFuture, "Enter a future expiry date as MM/YY, e.g. 12/29."),
  demoCvc: z.string().regex(/^\d{3}$/, "Enter any 3-digit CVC."),
});
export type CardValues = z.infer<typeof cardSchema>;
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
