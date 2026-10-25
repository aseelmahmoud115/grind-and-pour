"use client";

import Image from "next/image";
import { useId, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { formatCents, PROMO_CODES, type DeliveryMethod, totals } from "@/lib/money";
import { useCart } from "@/store/cart";
import type { CartItem } from "./cart-hooks";
import { SummaryRow } from "./CartParts";

/** Promo code field. WELCOME10 (10% off) is the only valid code. */
export function PromoForm() {
  const promo = useCart((s) => s.promo);
  const applyPromo = useCart((s) => s.applyPromo);
  const removePromo = useCart((s) => s.removePromo);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  if (promo) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-sage/25 px-4 py-2">
        <p role="status" className="text-[15px] text-espresso">
          <span className="font-semibold">{PROMO_CODES[promo]?.label ?? promo}</span> applied
        </p>
        <button
          type="button"
          onClick={removePromo}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-espresso hover:bg-espresso/10"
          aria-label={`Remove promo code ${promo}`}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setError("Enter a promo code.");
    setError(applyPromo(code) ? null : "That code isn't valid. Try WELCOME10 for 10% off.");
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-espresso">
        Promo code
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-12 min-w-0 flex-1 rounded-xl border border-espresso/20 bg-cream-light px-4 text-[16px] text-espresso uppercase placeholder:normal-case aria-[invalid=true]:border-terracotta"
          placeholder="e.g. WELCOME10"
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 cursor-pointer items-center rounded-full border border-espresso px-5 text-[15px] font-medium text-espresso transition-colors hover:bg-espresso hover:text-cream-light"
        >
          Apply
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-[#9A4524]">
          {error}
        </p>
      )}
    </form>
  );
}

/**
 * Subtotal, discount, shipping and total, all in cents. `delivery` null means the
 * method hasn't been chosen yet (shown as an estimate based on standard delivery).
 */
export function Totals({ subtotal, promo, delivery }: { subtotal: number; promo: string | null; delivery: DeliveryMethod | null }) {
  const t = totals(subtotal, promo, delivery ?? "standard");
  return (
    <dl className="space-y-2">
      <SummaryRow label="Subtotal" value={formatCents(t.subtotal)} />
      {t.discount > 0 && <SummaryRow label={`Discount (${promo})`} value={`−${formatCents(t.discount)}`} />}
      <SummaryRow
        label={delivery ? `Shipping (${delivery === "express" ? "Express" : "Standard"})` : "Shipping (standard)"}
        value={t.shipping === 0 ? "Free" : formatCents(t.shipping)}
      />
      <div className="border-t border-espresso/15 pt-3">
        <SummaryRow label="Total" value={formatCents(t.total)} strong />
      </div>
    </dl>
  );
}

/** Compact read-only line items for the checkout sidebar. */
export function SummaryItems({ items }: { items: CartItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3">
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
            <Image src={item.product.images[0]} alt="" fill sizes="48px" className="object-cover" />
            <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-espresso text-[11px] font-semibold text-cream-light tabular-nums">
              {item.qty}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-espresso">{item.product.name}</p>
            <p className="text-sm text-roast">
              {item.variantLabel} · {item.grind}
              <span className="sr-only">, quantity {item.qty}</span>
            </p>
          </div>
          <p className="text-[15px] text-espresso tabular-nums">{formatCents(item.lineCents)}</p>
        </li>
      ))}
    </ul>
  );
}
