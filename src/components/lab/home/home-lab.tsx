import Link from "next/link";
import type { ComponentType } from "react";

import { HomeThemeToggle } from "@/components/home/home-theme-toggle";

import styles from "./home-lab.module.css";
import {
  ContactSheet,
  FactRail,
  Headline,
  Host,
  Numbers,
  Pinned,
  PitchTiles,
  SentenceIndex,
  Spine,
  Status,
} from "./variants";

/**
 * Ten directions for the homepage, one per page so a pinned or full-width
 * layout can be judged as a page rather than as a cropped sample. Each changes
 * one thing and leaves the rest as the homepage has it. Development only.
 */
export const homeStudies: readonly {
  slug: string;
  name: string;
  idea: string;
  Component: ComponentType;
}[] = [
  {
    slug: "1",
    name: "Headline first",
    idea: "The full name, then one bright sentence, then a quieter line.",
    Component: Headline,
  },
  {
    slug: "2",
    name: "Fact rail",
    idea: "A spec list beside the prose, for the reader who scans.",
    Component: FactRail,
  },
  {
    slug: "3",
    name: "Pinned identity",
    idea: "Who I am stays on screen while the work scrolls past.",
    Component: Pinned,
  },
  {
    slug: "4",
    name: "Character as host",
    idea: "The character grows up and introduces each section.",
    Component: Host,
  },
  {
    slug: "5",
    name: "Sentence as index",
    idea: "Each claim in the intro previews and links to its proof.",
    Component: SentenceIndex,
  },
  {
    slug: "6",
    name: "Numbers band",
    idea: "Four results from the case studies, straight after the intro.",
    Component: Numbers,
  },
  {
    slug: "7",
    name: "Pitch tiles",
    idea: "Role, years and one result under each card, plus a Now row.",
    Component: PitchTiles,
  },
  {
    slug: "8",
    name: "Contact sheet",
    idea: "The feed as a filterable grid, a third of the length.",
    Component: ContactSheet,
  },
  {
    slug: "9",
    name: "Career spine",
    idea: "Experience and the feed merged: each role opens onto its work.",
    Component: Spine,
  },
  {
    slug: "10",
    name: "Say what you want",
    idea: "A status line, real buttons, and the fit at a glance.",
    Component: Status,
  },
];

export function HomeLab({ slug }: { slug: string }) {
  const study = homeStudies.find((entry) => entry.slug === slug);
  if (!study) return null;
  const { Component } = study;

  return (
    <div className={`editorial-page ${styles.page}`}>
      <p className={styles.note}>
        <span>{study.slug.padStart(2, "0")}</span> {study.name}. {study.idea}
      </p>

      <Component />

      <nav aria-label="Homepage studies" className={styles.switcher}>
        <ol>
          {homeStudies.map((entry) => (
            <li key={entry.slug}>
              <Link
                aria-current={entry.slug === slug ? "page" : undefined}
                aria-label={`${entry.slug}. ${entry.name}`}
                href={`/lab/home/${entry.slug}`}
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
