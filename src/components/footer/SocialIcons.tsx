/**
 * Simple line glyphs for the social links. lucide-react no longer ships brand
 * icons, so these are drawn generically rather than using official logos.
 */
const common = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "size-5",
};

const ICONS = {
  Instagram: (
    <svg {...common}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </svg>
  ),
  Facebook: (
    <svg {...common}>
      <path d="M14.5 8H16V4.5h-2.2A3.8 3.8 0 0 0 10 8.3V11H7.5v3.5H10V20h3.5v-5.5h2.4l.6-3.5h-3V8.8c0-.5.4-.8 1-.8Z" />
    </svg>
  ),
  TikTok: (
    <svg {...common}>
      <path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.46" />
      <path d="M14 4c.4 2.4 2 4 4.5 4.2" />
    </svg>
  ),
  YouTube: (
    <svg {...common}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10.5 9.5 4 2.5-4 2.5Z" fill="currentColor" />
    </svg>
  ),
};

export function SocialIcons() {
  return (
    <ul className="flex gap-2">
      {(Object.keys(ICONS) as (keyof typeof ICONS)[]).map((name) => (
        <li key={name}>
          <a
            href="#"
            aria-label={`Grind & Pour on ${name} (demo link)`}
            className="inline-flex size-11 items-center justify-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream hover:text-espresso"
          >
            {ICONS[name]}
          </a>
        </li>
      ))}
    </ul>
  );
}
