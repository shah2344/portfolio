import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { HomeLogo } from "@/components/home/character/home-logo";
import {
  dribbbleIcon,
  githubIcon,
  mailIcon,
  pdfIcon,
} from "@/components/home/dock/icons";
import { companyMarks } from "@/components/home/experience/list";
import { RemixIcon } from "@/components/ui/remix-icon";
import { SmoothSurface } from "@/components/ui/smooth-surface";
import { buildExperienceGroups } from "@/content/experience";
import { cn } from "@/lib/utils";

import { EMAIL, type LabFeedItem, type LabWork } from "./data";
import styles from "./home-lab.module.css";

/*
 * Static stand-ins for the homepage's own parts, so each study can rearrange
 * them without touching the real components or their entrance choreography.
 */

export function Character({ className }: { className?: string }) {
  return (
    <div className={cn(styles.character, className)}>
      <HomeLogo preview />
    </div>
  );
}

export function Mark({
  company,
  size = 28,
}: {
  company: string;
  size?: number;
}) {
  const mark = companyMarks[company];
  return (
    <SmoothSurface
      aria-hidden="true"
      as="span"
      className={cn(
        "experience-item__mark",
        mark && `experience-item__mark--${mark.slug}`,
      )}
      style={{ "--experience-mark": `${size}px` } as CSSProperties}
    >
      {mark ? (
        <Image alt="" sizes={`${size}px`} src={mark.src} />
      ) : (
        company.charAt(0)
      )}
    </SmoothSurface>
  );
}

/** The intro as the homepage sets it today. */
export function Intro({ className }: { className?: string }) {
  return (
    <div className={cn(styles.intro, className)}>
      <p>
        I&rsquo;m <span className={styles.ink}>Muhammad</span>, a product
        designer from Toronto, currently exploring AI and design systems at{" "}
        <span className={styles.ink}>Montran</span>.
      </p>
      <p>
        I&rsquo;ve spent the last 7 years designing fintech and HR tech products
        used by hundreds of thousands of people. I&rsquo;m a generalist with a
        passion for coherence.
      </p>
    </div>
  );
}

const profiles = [
  { label: "Email", href: `mailto:${EMAIL}`, icon: mailIcon },
  { label: "Resume", href: "/Muhammad-Shahid-Resume.pdf", icon: pdfIcon },
  {
    label: "Dribbble",
    href: "https://dribbble.com/Muhammad_Shahid",
    icon: dribbbleIcon,
  },
  {
    label: "GitHub",
    href: "https://github.com/shah2344/portfolio",
    icon: githubIcon,
  },
] as const;

/** Profile links, each keeping its name at every width. */
export function Links({
  className,
  only,
}: {
  className?: string;
  only?: readonly string[];
}) {
  return (
    <nav
      aria-label="Profiles and résumé"
      className={cn(styles.links, className)}
    >
      {profiles
        .filter(({ label }) => !only || only.includes(label))
        .map(({ label, href, icon }) => {
          const external = !href.startsWith("mailto:");
          return (
            <a
              href={href}
              key={label}
              rel={external ? "noopener noreferrer" : undefined}
              target={external ? "_blank" : undefined}
            >
              <RemixIcon icon={icon} />
              {label}
            </a>
          );
        })}
    </nav>
  );
}

export function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 className="section-heading" id={id}>
      <span>{children}</span>
    </h2>
  );
}

export function WorkCard({
  project,
  className,
}: {
  project: LabWork;
  className?: string;
}) {
  return (
    <Link
      className={cn(styles.card, className)}
      data-project={project.id}
      data-tone={project.tone}
      href={project.href}
    >
      <span className={styles.cardHead}>
        <Mark company={project.name} size={44} />
        <span className={styles.cardTagline}>{project.tagline}.</span>
      </span>
      <span className={styles.cardMedia}>
        <Image
          alt={project.alt}
          fill
          placeholder="blur"
          sizes="(max-width: 780px) 100vw, 540px"
          src={project.image}
        />
      </span>
    </Link>
  );
}

/** The Experience list's own rows, without their scroll entrance. */
export function ExperienceRows() {
  return (
    <ol className="experience-list">
      {buildExperienceGroups().map((group, index) => (
        <li className="experience-group" key={group.company + index}>
          <h3 className="experience-group__company">
            <Mark company={group.company} />
            {group.company}
          </h3>
          <ol className="experience-group__roles">
            {group.roles.map((role) => (
              <li className="experience-role" key={role.title}>
                <span className="experience-role__title">{role.title}</span>
                <RoleDates role={role} />
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

export function RoleDates({
  role,
}: {
  role: ReturnType<typeof buildExperienceGroups>[number]["roles"][number];
}) {
  return (
    <time className="experience-role__dates" dateTime={role.dateTime}>
      {role.dateFrom}
      {role.dateTo !== null && (
        <>
          {" – "}
          <span className={role.ongoing ? "experience-role__now" : undefined}>
            {role.dateTo}
          </span>
        </>
      )}
    </time>
  );
}

export function FeedTile({
  item,
  className,
  sizes = "(max-width: 780px) 100vw, 724px",
}: {
  item: LabFeedItem;
  className?: string;
  sizes?: string;
}) {
  return (
    <figure
      className={cn(styles.tile, className)}
      data-kind={item.kind}
      data-motion={item.motion ? "" : undefined}
    >
      <div className={styles.tileMedia}>
        <Image
          alt={item.alt}
          fill
          placeholder="blur"
          sizes={sizes}
          src={item.image}
        />
        {item.overlay && (
          <Image
            alt=""
            className={styles.tileOverlay}
            sizes="(max-width: 780px) 62vw, 450px"
            src={item.overlay}
          />
        )}
      </div>
      <figcaption>
        <span className={styles.tileTitle}>{item.title}</span>
        <span className={styles.tileSub}>
          {item.source} · {item.year}
        </span>
      </figcaption>
    </figure>
  );
}

export function Contact() {
  return (
    <footer className={styles.contact}>
      <p>
        For new roles or collaborations, reach me at{" "}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>
    </footer>
  );
}
