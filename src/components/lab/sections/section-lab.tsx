import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { CaseStudyTiles } from "@/components/home/case-study-tiles/case-study-tiles";
import { projects } from "@/components/home/home-content";
import { HomeThemeToggle } from "@/components/home/home-theme-toggle";
import { feed } from "@/components/lab/home/data";
import base from "@/components/lab/home/home-lab.module.css";
import {
  Character,
  Contact,
  ExperienceRows,
  FeedTile,
  Heading,
  Intro,
  Links,
} from "@/components/lab/home/parts";

import styles from "./section-lab.module.css";

/**
 * Ways to divide the homepage's sections, each on the homepage as it is
 * today: same copy, same cards, same order. Only the space between sections
 * and the frame around them change. The feed is cut to three items to keep
 * the page short. Development only.
 */
export const separatorStudies = [
  { slug: "1", name: "Hatched bands" },
  { slug: "2", name: "Ruled grid" },
  { slug: "3", name: "Sheets" },
  { slug: "4", name: "Labelled bands" },
  { slug: "5", name: "Hatched margins" },
  { slug: "6", name: "Tone shift" },
] as const;

const sections: readonly {
  id: string;
  label: string;
  body: ReactNode;
}[] = [
  {
    id: "work",
    label: "Selected work",
    body: <CaseStudyTiles projects={projects} />,
  },
  { id: "experience", label: "Experience", body: <ExperienceRows /> },
  {
    id: "feed",
    label: "Feed",
    body: (
      <div className={base.feed}>
        {feed.slice(0, 3).map((item) => (
          <FeedTile
            item={item}
            key={item.id}
            sizes="(max-width: 780px) 100vw, 676px"
          />
        ))}
      </div>
    ),
  },
];

/** The space between two blocks. Decoration only; the label, where a study
    shows one, repeats the heading that follows it. */
function Band({ label, index }: { label?: string; index?: number }) {
  return (
    <div aria-hidden="true" className={styles.band}>
      {label && (
        <span className={styles.bandLabel}>
          {index !== undefined && (
            <span className={styles.bandIndex}>
              {String(index).padStart(2, "0")}
            </span>
          )}
          {label}
        </span>
      )}
    </div>
  );
}

export function SectionLab({ slug }: { slug: string }) {
  const study = separatorStudies.find((entry) => entry.slug === slug);
  if (!study) return null;

  return (
    <div
      className={`editorial-page ${base.page} ${styles.page}`}
      data-separator={slug}
    >
      <main className={styles.column}>
        <Band />
        <header className={styles.block}>
          <div className={styles.masthead}>
            <Character />
            <h1 className="sr-only">Muhammad Shahid</h1>
            <Intro />
            <Links />
          </div>
        </header>

        {sections.map(({ id, label, body }, index) => (
          <Fragment key={id}>
            <Band index={index + 1} label={label} />
            <section
              aria-labelledby={id}
              className={styles.block}
              data-alt={index % 2 === 0 ? "" : undefined}
            >
              <Heading id={id}>{label}</Heading>
              {body}
            </section>
          </Fragment>
        ))}

        <Band />
        <div className={styles.block}>
          <Contact />
        </div>
        <Band />
      </main>

      <nav aria-label="Separator studies" className={base.switcher}>
        <ol>
          {separatorStudies.map((entry) => (
            <li key={entry.slug}>
              <Link
                aria-current={entry.slug === slug ? "page" : undefined}
                aria-label={`${entry.slug}. ${entry.name}`}
                href={`/lab/sections/${entry.slug}`}
                title={entry.name}
              >
                {entry.slug}
              </Link>
            </li>
          ))}
        </ol>
        <HomeThemeToggle />
      </nav>
    </div>
  );
}
