import type { CSSProperties } from "react";
import {
  dribbbleIcon,
  githubIcon,
  mailIcon,
  pdfIcon,
} from "@/components/home/dock/icons";
import { HomeDockTrack } from "@/components/home/dock/track";
import { RemixIcon } from "@/components/ui/remix-icon";

/** The URL names the file browsers offer when saving from their PDF viewer. */
const RESUME_HREF = "/Muhammad-Shahid-Resume.pdf";

const profiles: readonly {
  id: string;
  label: string;
  href: string;
  icon: string;
  ariaLabel?: string;
}[] = [
  {
    id: "email",
    label: "Email",
    href: "mailto:hello@muhammad.design",
    icon: mailIcon,
    ariaLabel: "Email",
  },
  {
    id: "resume",
    label: "Resume",
    href: RESUME_HREF,
    icon: pdfIcon,
    ariaLabel: "Open resume (PDF) in a new tab",
  },
  {
    id: "dribbble",
    label: "Dribbble",
    href: "https://dribbble.com/Muhammad_Shahid",
    icon: dribbbleIcon,
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/shah2344/portfolio",
    icon: githubIcon,
  },
];

/** Profile and résumé links below the introduction. */
export function HomeDock({ enterStyle }: { enterStyle?: CSSProperties }) {
  return (
    <div className="home-dock" style={enterStyle}>
      <div aria-hidden="true" className="home-dock__blur">
        <span />
        <span />
      </div>

      <nav
        aria-label="Profiles and résumé"
        className="home-dock__bar"
        data-home-enter="idle"
        data-home-load=""
        data-home-enter-kind="dock"
        style={enterStyle}
      >
        <HomeDockTrack>
          <ul className="home-dock__group" role="list">
            {profiles.map(({ id, label, href, icon, ariaLabel }, index) => {
              const opensNewTab =
                href.startsWith("http") || href === RESUME_HREF;
              return (
                <li
                  data-home-dock-item=""
                  key={label}
                  style={
                    {
                      "--home-enter-offset": `${index * 40}ms`,
                    } as CSSProperties
                  }
                >
                  <a
                    aria-label={ariaLabel ?? label}
                    className="home-dock__link"
                    data-profile={id}
                    href={href}
                    rel={opensNewTab ? "noopener noreferrer" : undefined}
                    target={opensNewTab ? "_blank" : undefined}
                  >
                    <RemixIcon className="home-dock__icon" icon={icon} />
                    <span className="home-dock__label" aria-hidden="true">
                      {label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </HomeDockTrack>
      </nav>
    </div>
  );
}
