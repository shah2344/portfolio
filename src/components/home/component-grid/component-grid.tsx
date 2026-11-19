import type { CSSProperties, ReactNode } from "react";

import { SmoothSurface } from "@/components/ui/smooth-surface";

import styles from "./component-grid.module.css";

/**
 * Separate cards sharing one feed slot, three columns wide (or two). One
 * card is the lead and spans the rows; the cards beside it split that height
 * between them, in the same 3:2 card as the rest of the feed.
 *
 * Two columns make each card about half again as wide, so their components
 * are laid out on a 560pt screen instead of 375pt: the scale on screen stays
 * the same as in a three-column grid. A phone shows one card at a time, so
 * every grid goes back to the 375pt screen there.
 */
export function ComponentGrid({
  columns = 3,
  rows,
  bleed = false,
  children,
}: {
  columns?: 2 | 3;
  /**
   * On a phone, keep the feed card's height with every card filling it, and
   * run the carousel to both edges of the screen.
   */
  bleed?: boolean;
  /** `grid-template-rows`, when the rows shouldn't split the height evenly. */
  rows?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`pg-split ${styles.grid}`}
      data-bleed={bleed || undefined}
      data-columns={columns}
      style={rows ? ({ "--rows": rows } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

export function GridCell({
  column,
  row,
  label,
  lead = false,
  children,
}: {
  column: string;
  row: string;
  label: string;
  /** The card the set is about; a phone shows it first. */
  lead?: boolean;
  children: ReactNode;
}) {
  return (
    <SmoothSurface
      aria-label={label}
      as="div"
      className={styles.cell}
      data-lead={lead || undefined}
      role="group"
      style={{ "--cell-column": column, "--cell-row": row } as CSSProperties}
    >
      {children}
    </SmoothSurface>
  );
}
