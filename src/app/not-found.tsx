import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[80vh] flex-col items-center justify-center bg-cream px-5 pt-[var(--nav-h)] text-center">
      <p className="eyebrow text-roast">404 · Page not found</p>
      <h1 className="display mt-4 text-espresso">
        Spilled
      </h1>
      <p className="mt-6 max-w-md text-[17px] text-espresso">
        This page has gone cold. The coffee you were looking for may have sold out, or the link has a typo.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/shop" className="inline-flex h-12 items-center justify-center rounded-full bg-espresso px-7 font-medium text-cream-light hover:bg-roast">
          Shop coffee
        </Link>
        <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full border border-espresso px-7 font-medium text-espresso hover:bg-espresso hover:text-cream-light">
          Back home
        </Link>
      </div>
    </main>
  );
}
