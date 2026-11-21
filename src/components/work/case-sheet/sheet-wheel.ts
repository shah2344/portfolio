/**
 * Scroll to close, for the desktop sheet: the wheel's version of pulling it
 * down.
 *
 * With the story at its top, scrolling further up pulls the sheet down, one
 * to one, and the homepage comes forward behind it. Letting go past a share
 * of the screen closes it; short of that it springs back. Pulled far enough,
 * it closes without waiting for the scroll to stop.
 *
 * A wheel has no "finger up", so a gesture here is a run of wheel events
 * with no pause longer than `IDLE`; the pause is the release. A run may only
 * pull if it began with the story already at its top. That keeps a flick
 * from far down, whose momentum carries on past the top, from closing the
 * sheet: the reader stops at the top, then pulls, as they would on a phone.
 * A mouse wheel steps a hundred pixels or so a notch, so the close distance
 * never falls below what one notch reaches.
 */

/** A pause, in ms, that ends one run of wheel events and starts the next. */
const IDLE = 200;
/** Share of the screen a pull has to reach for the release to close. */
const DISTANCE = 0.2;
/** Never less than this, in px, so a single mouse notch can't close. */
const MIN_DISTANCE = 160;
/** Share of the screen at which the pull closes at once. */
const COMMIT = 0.4;

const LINE = 16;

/** An element between the wheel and the scroller that is scrolled down. */
function scrolledWithin(target: Element, scroller: Element) {
  for (
    let node: Element | null = target;
    node && node !== scroller;
    node = node.parentElement
  ) {
    if (node.scrollTop > 0) return true;
  }
  return scroller.scrollTop > 0;
}

export function trackSheetWheel(
  sheet: HTMLElement,
  scroller: HTMLElement,
  handlers: {
    /** Whether a pull may start now (the sheet is open and settled). */
    canStart: () => boolean;
    /** The sheet has moved to `offset` px below rest. */
    onMove: (offset: number) => void;
    /** Let go: `close` says whether the pull closes the sheet. */
    onEnd: (close: boolean) => void;
  },
) {
  let last = -Infinity;
  /** Whether the current run began at the top and may pull. */
  let armed = false;
  /** The current run already closed the sheet; the rest of it is ignored. */
  let spent = false;
  let offset = 0;
  let timer = 0;

  const closeAt = () => Math.max(MIN_DISTANCE, window.innerHeight * DISTANCE);

  const release = () => {
    if (offset <= 0) return;
    const close = offset >= closeAt();
    offset = 0;
    handlers.onEnd(close);
  };

  const onWheel = (event: WheelEvent) => {
    const now = event.timeStamp;
    const fresh = now - last > IDLE;
    last = now;
    window.clearTimeout(timer);

    if (fresh) {
      spent = false;
      const target = event.target as Element | null;
      armed =
        !!target &&
        handlers.canStart() &&
        !target.closest("dialog[open]") &&
        !scrolledWithin(target, scroller);
    }
    if (spent) {
      // What's left of the run that closed the sheet goes nowhere.
      event.preventDefault();
      return;
    }
    // A pinch on a trackpad arrives as a wheel with ctrl held; sideways is a
    // carousel's.
    if (
      !armed ||
      event.ctrlKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ) {
      return;
    }

    const scale =
      event.deltaMode === 1
        ? LINE
        : event.deltaMode === 2
          ? window.innerHeight
          : 1;
    const delta = event.deltaY * scale;
    // Scrolling down with the sheet at rest is plain reading.
    if (offset <= 0 && (delta >= 0 || scroller.scrollTop > 0)) return;

    // Holds the story still and keeps the overscroll bounce out of it.
    event.preventDefault();
    offset = Math.max(0, offset - delta);
    if (offset >= window.innerHeight * COMMIT) {
      offset = 0;
      spent = true;
      handlers.onEnd(true);
      return;
    }
    handlers.onMove(offset);
    if (offset > 0) timer = window.setTimeout(release, IDLE);
    else handlers.onEnd(false);
  };

  // Not passive: it has to be able to keep the story from scrolling.
  sheet.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    window.clearTimeout(timer);
    sheet.removeEventListener("wheel", onWheel);
  };
}
