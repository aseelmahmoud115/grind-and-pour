"use client";

import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";

const control =
  "block h-12 w-full rounded-xl border bg-cream-light px-4 text-[16px] text-espresso placeholder:text-roast transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta aria-[invalid=true]:border-terracotta";

type BaseProps = {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  /** Dark variant for the espresso footer. */
  tone?: "light" | "dark";
  className?: string;
};

/** Label, control, hint and inline error, wired up with aria-invalid / aria-describedby. */
function useFieldIds(error?: string, hint?: ReactNode) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return { id, errorId, hintId, describedBy };
}

function FieldShell({
  id,
  label,
  optional,
  hint,
  hintId,
  error,
  errorId,
  tone = "light",
  className = "",
  children,
}: BaseProps & { id: string; hintId: string; errorId: string; children: ReactNode }) {
  const dark = tone === "dark";
  return (
    <div className={className}>
      <label htmlFor={id} className={`mb-1.5 block text-sm font-medium ${dark ? "text-cream" : "text-espresso"}`}>
        {label}
        {optional && <span className={dark ? "font-normal text-cream/70" : "font-normal text-roast"}> (optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={hintId} className={`mt-1.5 text-sm ${dark ? "text-cream/75" : "text-roast"}`}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={`mt-1.5 text-sm font-medium ${dark ? "text-[#F0B49A]" : "text-[#9A4524]"}`}>
          {error}
        </p>
      )}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, BaseProps & Omit<ComponentProps<"input">, "className">>(function TextField(
  { label, error, hint, optional, tone, className, ...input },
  ref,
) {
  const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);
  return (
    <FieldShell {...{ id, label, optional, hint, hintId, error, errorId, tone, className }}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${control} ${tone === "dark" ? "border-cream/30" : "border-espresso/20"}`}
        {...input}
      />
    </FieldShell>
  );
});

export const SelectField = forwardRef<HTMLSelectElement, BaseProps & Omit<ComponentProps<"select">, "className">>(
  function SelectField({ label, error, hint, optional, tone, className, children, ...select }, ref) {
    const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);
    return (
      <FieldShell {...{ id, label, optional, hint, hintId, error, errorId, tone, className }}>
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${control} cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%232A1A12%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_1rem_center] bg-no-repeat pr-11 border-espresso/20`}
          {...select}
        >
          {children}
        </select>
      </FieldShell>
    );
  },
);

export const TextAreaField = forwardRef<HTMLTextAreaElement, BaseProps & Omit<ComponentProps<"textarea">, "className">>(
  function TextAreaField({ label, error, hint, optional, tone, className, ...area }, ref) {
    const { id, errorId, hintId, describedBy } = useFieldIds(error, hint);
    return (
      <FieldShell {...{ id, label, optional, hint, hintId, error, errorId, tone, className }}>
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${control} h-auto min-h-32 py-3 border-espresso/20`}
          {...area}
        />
      </FieldShell>
    );
  },
);
