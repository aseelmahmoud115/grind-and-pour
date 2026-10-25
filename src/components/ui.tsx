import type { ComponentProps, ReactNode } from "react";

export function ArrowDownIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function PlusIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CartIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}

export function PillLink({ children, className = "", ...rest }: ComponentProps<"a">) {
  return (
    <a
      {...rest}
      className={`inline-flex h-12 cursor-pointer items-center rounded-full bg-espresso px-7 text-[15px] font-medium text-cream-light transition-colors duration-200 hover:bg-roast ${className}`}
    >
      {children}
    </a>
  );
}

export function CircleArrowLink({ label, ...rest }: ComponentProps<"a"> & { label: string }) {
  return (
    <a
      {...rest}
      aria-label={label}
      className="inline-flex size-12 cursor-pointer items-center justify-center rounded-full border border-espresso text-espresso transition-colors duration-200 hover:bg-espresso hover:text-cream-light"
    >
      <ArrowDownIcon />
    </a>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow text-espresso ${className}`}>{children}</p>;
}
