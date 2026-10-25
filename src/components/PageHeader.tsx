import type { ReactNode } from "react";

/** Heading block for store and info pages: eyebrow, chunky Fraunces title, short intro. */
export function PageHeader({ eyebrow, title, intro, id }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; id?: string }) {
  return (
    <header className="max-w-3xl">
      {eyebrow && <p className="eyebrow text-roast">{eyebrow}</p>}
      <h1
        id={id}
        className="font-display mt-3 text-5xl leading-[0.95] font-black tracking-tight text-espresso [font-variation-settings:'SOFT'_100,'WONK'_1] sm:text-6xl lg:text-7xl"
      >
        {title}
      </h1>
      {intro && <div className="mt-4 max-w-2xl text-[17px] leading-relaxed text-espresso">{intro}</div>}
    </header>
  );
}

/** Standard page frame below the fixed navbar. */
export function PageMain({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main id="main" className={`min-h-[70vh] bg-cream px-5 pt-[calc(var(--nav-h)+2.5rem)] pb-20 sm:px-8 lg:px-14 lg:pt-[calc(var(--nav-h)+4rem)] ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  );
}
