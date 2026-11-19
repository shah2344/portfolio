import type { CSSProperties } from "react";
import {
  dribbbleIcon,
  githubIcon,
  linkedinIcon,
  mailIcon,
} from "@/components/home/dock/icons";
import { HomeDockTrack } from "@/components/home/dock/track";
import { RemixIcon } from "@/components/ui/remix-icon";

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
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/muhammad-s-a0960117a",
    icon: linkedinIcon,
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

/** Profile links below the introduction. */
export function HomeDock({ enterStyle }: { enterStyle?: CSSProperties }) {
  return (
    <div className="home-dock" style={enterStyle}>
      <div aria-hidden="true" className="home-dock__blur">
        <span />
        <span />
      </div>

      <nav
        aria-label="Profiles"
        className="home-dock__bar"
        data-home-enter="idle"
        data-home-load=""
        data-home-enter-kind="dock"
        style={enterStyle}
      >
        <HomeDockTrack>
          <ul className="home-dock__group" role="list">
            {profiles.map(({ id, label, href, icon, ariaLabel }, index) => {
              const opensNewTab = href.startsWith("http");
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
