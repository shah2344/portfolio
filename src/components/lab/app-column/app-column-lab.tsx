import Link from "next/link";
import type { ReactNode } from "react";

import {
  ComponentGrid,
  GridCell,
} from "@/components/home/component-grid/component-grid";
import { FitStage } from "@/components/home/component-grid/fit-stage";
import { ActivityPrimitive } from "@/components/home/component-grid/app/primitives/activity";
import { AmountPrimitive } from "@/components/home/component-grid/app/primitives/amount";
import { AvatarPickerPrimitive } from "@/components/home/component-grid/app/primitives/avatar-picker";
import { FiltersPrimitive } from "@/components/home/component-grid/app/primitives/filters";
import { TransferFlow } from "@/components/home/component-grid/app/transfer-flow";

import styles from "./app-column-lab.module.css";
import {
  ActivityWithPills,
  FilterSheet,
  FilteredActivity,
  GroupedSettings,
  ProfileSettings,
  SearchBar,
} from "./variants";

type Study = {
  slug: string;
  name: string;
  note: string;
  /** Column 3 as one card spanning both rows, or a top and bottom pair. */
  column: ReactNode | [ReactNode, ReactNode];
};

/**
 * Ways to rework the app grid's right column, each beside the real left
 * and middle columns. Development only.
 */
export const columnStudies: Study[] = [
  {
    slug: "0",
    name: "Current",
    note: "As shipped, for comparison.",
    column: [<FiltersPrimitive key="t" />, <ActivityPrimitive key="b" />],
  },
  {
    slug: "1",
    name: "Filter sheet",
    note: "The drawer on its own white sheet: header with Reset, segmented timeframe, an apply button that counts results. The unrelated name field goes.",
    column: [<FilterSheet key="t" />, <ActivityPrimitive key="b" />],
  },
  {
    slug: "2",
    name: "Search bar",
    note: "The field becomes a white search, pills run on one fading line, timeframe is segmented. One compact band, no dead space under it.",
    column: [<SearchBar key="t" />, <ActivityPrimitive key="b" />],
  },
  {
    slug: "3",
    name: "Grouped settings",
    note: "Every control in a white group with small labels, matching the white activity cards below so both cards share one language.",
    column: [<GroupedSettings key="t" />, <ActivityPrimitive key="b" />],
  },
  {
    slug: "4",
    name: "Filters drive the list",
    note: "One tall card: pills on top actually filter the activity beneath, rows rearranging. The column tells one story instead of two.",
    column: <FilteredActivity />,
  },
  {
    slug: "5",
    name: "Profile + filtered activity",
    note: "The name field joins Maya's profile with two switches; the pills move down onto the activity card and filter its rows.",
    column: [<ProfileSettings key="t" />, <ActivityWithPills key="b" />],
  },
];

export function AppColumnLab({ slug }: { slug: string }) {
  const study = columnStudies.find((entry) => entry.slug === slug);
  if (!study) return null;
  const { column } = study;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>
            {study.slug}. {study.name}
          </h1>
          <p>{study.note}</p>
        </header>
        <div className={styles.frame}>
          <ComponentGrid>
            <GridCell column="1" label="AnyDay wallet balance" row="1">
              <AmountPrimitive />
            </GridCell>
            <GridCell column="1" label="AnyDay avatar picker" row="2">
              <AvatarPickerPrimitive />
            </GridCell>
            <GridCell
              column="2"
              label="AnyDay transfer review and slide to send"
              lead
              row="1 / span 2"
            >
              <FitStage className="anyday-app" fill={760}>
                <TransferFlow />
              </FitStage>
            </GridCell>
            {Array.isArray(column) ? (
              <>
                <GridCell column="3" label="Right column, top" row="1">
                  {column[0]}
                </GridCell>
                <GridCell column="3" label="Right column, bottom" row="2">
                  {column[1]}
                </GridCell>
              </>
            ) : (
              <GridCell column="3" label="Right column" row="1 / span 2">
                {column}
              </GridCell>
            )}
          </ComponentGrid>
        </div>
      </main>

      <nav aria-label="Column studies" className={styles.switcher}>
        <ol>
          {columnStudies.map((entry) => (
            <li key={entry.slug}>
              <Link
                aria-current={entry.slug === slug ? "page" : undefined}
                aria-label={`${entry.slug}. ${entry.name}`}
                href={`/lab/app-column/${entry.slug}`}
                title={entry.name}
              >
                {entry.slug}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
