"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({ email: z.email("Enter a valid email address, like name@example.com.") });
type Values = z.infer<typeof schema>;

/**
 * Validates and confirms on the page only; nothing is sent anywhere.
 * ≥640px: input and button on one row (48px tall, 12px gap, input grows to ~420px).
 * Below that they stack and the button is full width.
 */
export function Newsletter() {
  const [done, setDone] = useState(false);
  const id = useId();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onTouched" });
  const error = errors.email?.message;

  if (done) {
    return (
      <p role="status" className="font-display text-2xl font-semibold text-cream">
        You&apos;re on the list ☕
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(() => setDone(true))} noValidate className="w-full sm:max-w-[34rem] lg:w-[34rem] lg:shrink-0">
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          id={id}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-12 w-full min-w-0 rounded-xl border border-cream/30 bg-cream-light px-4 text-[16px] text-espresso placeholder:text-roast aria-[invalid=true]:border-[#F0B49A] sm:max-w-[420px] sm:flex-1"
          {...register("email")}
        />
        <button
          type="submit"
          className="inline-flex h-12 w-full shrink-0 cursor-pointer items-center justify-center rounded-full bg-cream px-7 text-[15px] font-medium text-espresso transition-colors hover:bg-cream-light sm:w-auto"
        >
          Subscribe
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-[#F0B49A]">
          {error}
        </p>
      )}
    </form>
  );
}
