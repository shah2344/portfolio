/**
 * Where the grid stops being driven by a pointer and starts being driven by
 * the scroll. It is the breakpoint the tiles already stack at: once they are
 * one per row there is no grid to sweep a pointer across, so the card the
 * reader has scrolled to takes the job instead.
 *
 * Width rather than `hover: none`, even though the phone is what this is for.
 * A device that cannot hover is not the same question as a layout that has
 * nothing to hover across, and keying on the input would leave a narrowed
 * desktop window — the first place anyone checks this — stacked but still
 * waiting for a pointer, which is to say doing nothing at all.
 *
 * The stylesheet matches this query verbatim; the two have to agree, or the
 * grid would report a focus the CSS is not listening for.
 */
export const SNAP_MODE = "(max-width: 780px)";

/** A tile and the vertical span it occupies, in the scroller's coordinates. */
export type SnapCandidate<T> = {
  tile: T;
  top: number;
  bottom: number;
};

/**
 * The candidate whose middle sits closest to `centre`, or null when there are
 * none.
 *
 * Several cards are on screen at once, so something has to choose between
 * them, and the one nearest the middle of the screen is the one the reader is
 * looking at. Measuring it this way also settles *when* the answer changes:
 * the card in front hands over at the moment the two are equally far from the
 * middle, halfway between them, rather than at either card's edge.
 *
 * A null answer is not "nothing is in front": it means nothing was on screen
 * to measure, and the caller holds whatever it was already showing rather than
 * flashing the section flat mid-scroll. That is the same hold the pointer path
 * makes when the cursor crosses the gutter between two tiles.
 */
export function nearestToCentre<T>(
  candidates: readonly SnapCandidate<T>[],
  centre: number,
): T | null {
  let nearest: T | null = null;
  let shortest = Number.POSITIVE_INFINITY;

  for (const { tile, top, bottom } of candidates) {
    const distance = Math.abs((top + bottom) / 2 - centre);
    if (distance < shortest) {
      shortest = distance;
      nearest = tile;
    }
  }

  return nearest;
}
