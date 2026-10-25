import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Native <details> accordion item: keyboard-operable and announced without extra script. */
export function AccordionItem({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-espresso/15">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-display text-xl font-semibold text-espresso [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-5 shrink-0 text-roast transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pb-6 text-[16px] leading-relaxed text-espresso">{children}</div>
    </details>
  );
}
