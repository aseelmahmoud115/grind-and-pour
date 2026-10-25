import { FaFacebook, FaGithub, FaLinkedin, FaYoutube } from "react-icons/fa6";
import { SITE } from "@/data/site";

/** Brand glyphs from one icon family (Font Awesome 6 via react-icons), monochrome cream. */
const LINKS = [
  { label: "LinkedIn", href: SITE.socials.linkedin, Icon: FaLinkedin },
  { label: "GitHub", href: SITE.socials.github, Icon: FaGithub },
  { label: "Facebook", href: SITE.socials.facebook, Icon: FaFacebook },
  { label: "YouTube", href: SITE.socials.youtube, Icon: FaYoutube },
];

export function SocialIcons() {
  return (
    <ul className="flex gap-2">
      {LINKS.map(({ label, href, Icon }) => {
        // Placeholders ("#") stay on the page; real profiles open in a new tab.
        const external = href.startsWith("http");
        return (
          <li key={label}>
            <a
              href={href}
              aria-label={label}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="inline-flex size-11 items-center justify-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream hover:text-espresso"
            >
              <Icon className="size-5" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
