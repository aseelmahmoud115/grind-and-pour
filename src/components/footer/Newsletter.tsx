"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField } from "@/components/forms/Field";

const schema = z.object({ email: z.email("Enter a valid email address, like name@example.com.") });
type Values = z.infer<typeof schema>;

/** Validates and confirms on the page only; nothing is sent anywhere. */
export function Newsletter() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onTouched" });

  if (done) {
    return (
      <p role="status" className="font-display text-2xl font-semibold text-cream">
        You&apos;re on the list ☕
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(() => setDone(true))} noValidate className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-start">
      <TextField
        tone="dark"
        label={<span className="sr-only">Email address</span>}
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        className="flex-1"
        error={errors.email?.message}
        {...register("email")}
      />
      <button
        type="submit"
        className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-cream px-7 text-[15px] font-medium text-espresso transition-colors hover:bg-cream-light sm:mt-[1.375rem]"
      >
        Subscribe
      </button>
    </form>
  );
}
