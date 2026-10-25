"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Check, ChevronDown, CreditCard, Info, LoaderCircle } from "lucide-react";
import { SelectField, TextField } from "@/components/forms/Field";
import { useCartView } from "@/components/shop/cart-hooks";
import { EmptyCart } from "@/components/shop/CartParts";
import { PromoForm, SummaryItems, Totals } from "@/components/shop/Summary";
import { addBusinessDays } from "@/lib/dates";
import { DELIVERY, formatCents, shippingCents, totals, type DeliveryMethod } from "@/lib/money";
import { useCart } from "@/store/cart";
import { newOrderId, useOrders, type Order } from "@/store/orders";
import { useUi } from "@/store/ui";
import {
  cardSchema,
  COUNTRIES,
  EMPTY_CARD,
  formatExpiry,
  shippingSchema,
  spaceCardNumber,
  type CardValues,
  type ShippingValues,
} from "./schemas";

const STEPS = ["Contact & shipping", "Delivery", "Payment"] as const;
const PROCESSING_MS = 1500;

const primary =
  "inline-flex h-13 cursor-pointer items-center justify-center gap-2 rounded-full bg-espresso px-8 text-base font-medium text-cream-light transition-colors hover:bg-roast disabled:cursor-wait disabled:opacity-70";
const radioCard =
  "flex cursor-pointer items-start gap-4 rounded-2xl border border-espresso/20 bg-cream-light p-4 transition-colors hover:border-espresso has-checked:border-espresso has-checked:ring-1 has-checked:ring-espresso has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-terracotta";

function StepIndicator({ step, onGoTo }: { step: number; onGoTo: (s: number) => void }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label="Checkout progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        const content = (
          <>
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                done || current ? "bg-espresso text-cream-light" : "border border-espresso/30 text-roast"
              }`}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : n}
            </span>
            <span className={`hidden text-[15px] sm:inline ${current ? "font-semibold text-espresso" : "text-roast"}`}>{label}</span>
            <span className="sr-only">
              {current ? ", current step" : done ? ", completed" : ""}
            </span>
          </>
        );
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-4" aria-current={current ? "step" : undefined}>
            {done ? (
              <button type="button" onClick={() => onGoTo(n)} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full pr-2">
                {content}
                <span className="sr-only"> (edit)</span>
              </button>
            ) : (
              <span className="flex min-h-11 items-center gap-2">{content}</span>
            )}
            {n < STEPS.length && <span aria-hidden="true" className="h-px w-6 bg-espresso/25 sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

export function CheckoutView() {
  const router = useRouter();
  const { hydrated, items, subtotal, promo } = useCartView();
  const clearCart = useCart((s) => s.clear);
  const addOrder = useOrders((s) => s.addOrder);
  const announce = useUi((s) => s.announce);

  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState<ShippingValues | null>(null);
  const [delivery, setDelivery] = useState<DeliveryMethod>("standard");
  const [payment, setPayment] = useState<"card" | "cod">("card");
  const [processing, setProcessing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const shippingForm = useForm<ShippingValues>({
    resolver: zodResolver(shippingSchema),
    mode: "onTouched",
    defaultValues: { country: "Egypt" },
  });
  const cardForm = useForm<CardValues>({ resolver: zodResolver(cardSchema), mode: "onTouched", defaultValues: EMPTY_CARD });

  // Move focus to the new step's heading so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  // Before delivery is chosen, show the standard-shipping estimate (as the summary's Totals does).
  const t = totals(subtotal, promo, step >= 2 ? delivery : "standard");

  if (!hydrated) return <div className="mt-10 h-96 animate-pulse rounded-3xl bg-cream-light" aria-hidden="true" />;
  if (placed) {
    return (
      <p role="status" className="mt-10 text-lg text-espresso">
        Order placed. Opening your confirmation…
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-3xl bg-cream-light">
        <EmptyCart />
      </div>
    );
  }

  const placeOrder = async () => {
    if (!shipping) return setStep(1);
    if (payment === "card") {
      const ok = await cardForm.trigger();
      if (!ok) return;
    }
    // Card details are never stored, logged or sent: clear them the moment they've been checked.
    cardForm.reset(EMPTY_CARD);
    setProcessing(true);
    announce("Processing your demo payment…");
    await new Promise((r) => setTimeout(r, PROCESSING_MS));

    const now = new Date();
    const method = DELIVERY[delivery];
    const final = totals(subtotal, promo, delivery);
    const order: Order = {
      id: newOrderId(),
      createdAt: now.toISOString(),
      items: items.map((i) => ({
        slug: i.slug,
        name: i.product.name,
        image: i.product.images[0],
        variantLabel: i.variantLabel,
        grind: i.grind,
        qty: i.qty,
        unitCents: i.unitCents,
      })),
      ...final,
      promo,
      contact: { email: shipping.email, fullName: shipping.fullName, phone: shipping.phone },
      address: { country: shipping.country, city: shipping.city, address: shipping.address, postalCode: shipping.postalCode || undefined },
      delivery,
      payment,
      estimate: {
        from: addBusinessDays(now, method.minDays).toISOString(),
        to: addBusinessDays(now, method.maxDays).toISOString(),
      },
    };
    addOrder(order);
    setPlaced(true);
    clearCart();
    router.push(`/order/${order.id}`);
  };

  const card = cardForm.register;
  const cardErrors = cardForm.formState.errors;

  return (
    <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
      {/* Order summary: a collapsible bar on mobile, a sticky sidebar on desktop. */}
      <aside aria-labelledby="checkout-summary-title" className="h-fit rounded-3xl bg-cream-light lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:order-2 lg:p-6">
        <h2 id="checkout-summary-title" className="hidden font-display text-2xl font-semibold text-espresso lg:block">
          Order summary
        </h2>
        <button
          type="button"
          aria-expanded={summaryOpen}
          aria-controls="checkout-summary"
          onClick={() => setSummaryOpen((v) => !v)}
          className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-5 text-left lg:hidden"
        >
          <span className="flex items-center gap-2 font-medium text-espresso">
            {summaryOpen ? "Hide" : "Show"} order summary
            <ChevronDown className={`size-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="font-semibold text-espresso tabular-nums">{formatCents(t.total)}</span>
        </button>
        <div id="checkout-summary" className={`${summaryOpen ? "block" : "hidden"} px-5 pb-6 lg:mt-5 lg:block lg:p-0`}>
          <SummaryItems items={items} />
          <div className="mt-6">
            <PromoForm />
          </div>
          <div className="mt-6">
            <Totals subtotal={subtotal} promo={promo} delivery={step >= 2 ? delivery : null} />
          </div>
        </div>
      </aside>

      <div className="lg:order-1">
        <StepIndicator step={step} onGoTo={(n) => !processing && setStep(n)} />

        {step === 1 && (
          <form
            onSubmit={shippingForm.handleSubmit((values) => {
              setShipping(values);
              setStep(2);
            })}
            noValidate
            className="mt-8"
          >
            <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-semibold text-espresso outline-none">
              Contact &amp; shipping
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <TextField
                className="sm:col-span-2"
                label="Email"
                type="email"
                autoComplete="email"
                error={shippingForm.formState.errors.email?.message}
                {...shippingForm.register("email")}
              />
              <TextField
                label="Full name"
                autoComplete="name"
                error={shippingForm.formState.errors.fullName?.message}
                {...shippingForm.register("fullName")}
              />
              <TextField
                label="Phone"
                type="tel"
                autoComplete="tel"
                error={shippingForm.formState.errors.phone?.message}
                {...shippingForm.register("phone")}
              />
              <SelectField
                label="Country"
                autoComplete="country-name"
                error={shippingForm.formState.errors.country?.message}
                {...shippingForm.register("country")}
              >
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </SelectField>
              <TextField
                label="City"
                autoComplete="address-level2"
                error={shippingForm.formState.errors.city?.message}
                {...shippingForm.register("city")}
              />
              <TextField
                className="sm:col-span-2"
                label="Address"
                autoComplete="street-address"
                error={shippingForm.formState.errors.address?.message}
                {...shippingForm.register("address")}
              />
              <TextField
                label="Postal code"
                optional
                autoComplete="postal-code"
                error={shippingForm.formState.errors.postalCode?.message}
                {...shippingForm.register("postalCode")}
              />
            </div>
            <button type="submit" className={`${primary} mt-8 w-full sm:w-auto`}>
              Continue to delivery
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(3);
            }}
            className="mt-8"
          >
            <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-semibold text-espresso outline-none">
              Delivery
            </h2>
            {shipping && (
              <p className="mt-2 text-[15px] text-roast">
                To {shipping.fullName}, {shipping.address}, {shipping.city}, {shipping.country}
              </p>
            )}
            <fieldset className="mt-6">
              <legend className="sr-only">Delivery method</legend>
              <div className="grid gap-3">
                {(Object.keys(DELIVERY) as DeliveryMethod[]).map((key) => {
                  const m = DELIVERY[key];
                  const price = shippingCents(subtotal, key);
                  return (
                    <label key={key} className={radioCard}>
                      <input
                        type="radio"
                        name="delivery"
                        value={key}
                        checked={delivery === key}
                        onChange={() => setDelivery(key)}
                        className="mt-1 size-5 accent-espresso"
                      />
                      <span className="flex-1">
                        <span className="flex justify-between gap-4 font-semibold text-espresso">
                          {m.label}
                          <span className="tabular-nums">{price === 0 ? "Free" : formatCents(price)}</span>
                        </span>
                        <span className="mt-1 block text-[15px] text-roast">
                          {m.days}
                          {key === "standard" && price > 0 && " · free on orders of $40 or more"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <button type="submit" className={`${primary} mt-8 w-full sm:w-auto`}>
              Continue to payment
            </button>
          </form>
        )}

        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void placeOrder();
            }}
            noValidate
            aria-busy={processing}
            className="mt-8"
          >
            <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-semibold text-espresso outline-none">
              Payment (demo)
            </h2>
            <div role="note" className="mt-5 flex gap-3 rounded-2xl border border-espresso/20 bg-sky/30 p-4 text-[15px] text-espresso">
              <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p>
                <strong>Demo store: no real payment is taken.</strong> Use test card 4242 4242 4242 4242, any future expiry
                date and any 3-digit CVC.
              </p>
            </div>

            <fieldset className="mt-6" disabled={processing}>
              <legend className="sr-only">Payment method</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={radioCard}>
                  <input type="radio" name="payment" checked={payment === "card"} onChange={() => setPayment("card")} className="mt-1 size-5 accent-espresso" />
                  <span className="flex items-center gap-2 font-semibold text-espresso">
                    <CreditCard className="size-5" aria-hidden="true" /> Card (demo)
                  </span>
                </label>
                <label className={radioCard}>
                  <input type="radio" name="payment" checked={payment === "cod"} onChange={() => setPayment("cod")} className="mt-1 size-5 accent-espresso" />
                  <span className="flex items-center gap-2 font-semibold text-espresso">
                    <Banknote className="size-5" aria-hidden="true" /> Cash on delivery
                  </span>
                </label>
              </div>
            </fieldset>

            {payment === "card" ? (
              <fieldset className="mt-6 grid gap-5 sm:grid-cols-2" disabled={processing}>
                <legend className="sr-only">Test card details</legend>
                <TextField
                  className="sm:col-span-2"
                  label="Card number"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  error={cardErrors.demoNumber?.message}
                  {...card("demoNumber", {
                    onChange: (e) => cardForm.setValue("demoNumber", spaceCardNumber(e.target.value)),
                  })}
                />
                <TextField
                  className="sm:col-span-2"
                  label="Name on card"
                  autoComplete="off"
                  error={cardErrors.demoName?.message}
                  {...card("demoName")}
                />
                <TextField
                  label="Expiry (MM/YY)"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="MM/YY"
                  maxLength={5}
                  error={cardErrors.demoExpiry?.message}
                  {...card("demoExpiry", {
                    onChange: (e) => cardForm.setValue("demoExpiry", formatExpiry(e.target.value)),
                  })}
                />
                <TextField
                  label="CVC"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={3}
                  error={cardErrors.demoCvc?.message}
                  {...card("demoCvc")}
                />
              </fieldset>
            ) : (
              <p className="mt-6 rounded-2xl bg-cream-light p-4 text-[15px] text-espresso">
                Pay the courier in cash when your coffee arrives. Please have {formatCents(totals(subtotal, promo, delivery).total)} ready.
              </p>
            )}

            <button type="submit" disabled={processing} className={`${primary} mt-8 w-full sm:w-auto`}>
              {processing ? (
                <>
                  <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Processing…
                </>
              ) : (
                `Place order · ${formatCents(totals(subtotal, promo, delivery).total)}`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
