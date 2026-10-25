"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SelectField, TextAreaField, TextField } from "./Field";

const TOPICS = ["An order", "Choosing a coffee", "Wholesale", "Something else"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.email("Enter a valid email address, like name@example.com."),
  topic: z.enum(TOPICS, { error: "Choose a topic." }),
  message: z.string().trim().min(10, "Write a message of at least 10 characters."),
});
type Values = z.infer<typeof schema>;

/** Validates and shows a confirmation; nothing is sent anywhere. */
export function ContactForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onTouched", defaultValues: { topic: "An order" } });

  if (sentTo) {
    return (
      <div role="status" className="rounded-3xl bg-cream-light p-8">
        <p className="font-display text-3xl font-semibold text-espresso">Thanks, message received</p>
        <p className="mt-3 text-[16px] text-espresso">
          In a real store we&apos;d reply to {sentTo} within one business day. This is a demo, so the message wasn&apos;t sent
          anywhere.
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            setSentTo(null);
          }}
          className="mt-6 inline-flex h-12 cursor-pointer items-center rounded-full border border-espresso px-6 font-medium text-espresso hover:bg-espresso hover:text-cream-light"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => setSentTo(v.email))} noValidate className="grid max-w-2xl gap-5 sm:grid-cols-2">
      <TextField label="Name" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <SelectField className="sm:col-span-2" label="Topic" error={errors.topic?.message} {...register("topic")}>
        {TOPICS.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </SelectField>
      <TextAreaField className="sm:col-span-2" label="Message" rows={6} error={errors.message?.message} {...register("message")} />
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="inline-flex h-13 cursor-pointer items-center rounded-full bg-espresso px-8 font-medium text-cream-light transition-colors hover:bg-roast"
        >
          Send message
        </button>
      </div>
    </form>
  );
}
