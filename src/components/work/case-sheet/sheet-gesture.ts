/**
 * Drag to close from anywhere on the sheet, for touch.
 *
 * The story scrolls the page, so a finger on it has to mean one of two
 * things, and the first move decides which. Pulling down with the story
 * already at its top drags the sheet; anything else (up, sideways, or a
 * gesture that began scrolled down and reached the top on the way) stays a
 * scroll, so carousels and the reading itself are untouched. The decision is
 * made on the first `touchmove`, the only one Safari lets a page cancel
 * before it commits to scrolling.
 *
 * Once dragging, the sheet follows the finger one to one, and resists when
 * pushed up past where it rests. Letting go closes it on a flick, judged by
 * the finger's speed over its last moments, or past a share of the screen
 * when let go slowly; a flick back up keeps it open from anywhere.
 */

/** Finger speed, in px/ms, that closes the sheet whatever the distance. */
const FLICK = 0.4;
/** Share of the screen a slow drag has to travel to close. */
const DISTANCE = 0.25;
/** Movement, in px, before the gesture is read as a drag or a scroll. */
const SLOP = 4;
/** How far back, in ms, the release speed is measured over: the latest
 *  movement, so a drag that turns back on release reads as turning back. */
const WINDOW = 50;

/** Elements whose own gestures win: they scroll, zoom or drag themselves. */
const OWN_GESTURES = [
  "[data-vaul-handle]",
  ".mobile-toc",
  ".mobile-toc-backdrop",
  "dialog[open]",
  "input",
  "textarea",
  "select",
  "[contenteditable]",
].join(",");

type Sample = { t: number; y: number };

/** An element between the touch and the sheet that is scrolled down itself. */
function scrolledWithin(target: Element, sheet: Element) {
  for (
    let node: Element | null = target;
    node && node !== sheet;
    node = node.parentElement
  ) {
    if (node.scrollTop > 0) return true;
  }
  return false;
}

/** Pushed up past rest, the sheet gives a little and less the further. */
function resist(offset: number) {
  return offset >= 0 ? offset : -Math.sqrt(-offset) * 2;
}

export function trackSheetDrag(
  sheet: HTMLElement,
  handlers: {
    /** Whether a drag may start now (the sheet is open and settled). */
    canStart: () => boolean;
    /** The sheet has moved to `offset` px below rest. */
    onMove: (offset: number) => void;
    /** Let go: `close` says whether the gesture closes the sheet. */
    onEnd: (close: boolean) => void;
  },
) {
  let id: number | null = null;
  let startX = 0;
  let startY = 0;
  let state: "pending" | "drag" | "scroll" = "scroll";
  let samples: Sample[] = [];

  const reset = () => {
    id = null;
    state = "scroll";
    samples = [];
  };

  const onStart = (event: TouchEvent) => {
    // A second finger is a pinch, not a drag.
    if (event.touches.length > 1) {
      if (state === "drag") finish(false);
      reset();
      return;
    }
    const touch = event.changedTouches[0];
    const target = event.target as Element | null;
    if (
      !touch ||
      !target ||
      !handlers.canStart() ||
      // Only a story already at its top hands its pull to the sheet.
      window.scrollY > 0 ||
      target.closest(OWN_GESTURES) ||
      scrolledWithin(target, sheet)
    ) {
      reset();
      return;
    }
    id = touch.identifier;
    startX = touch.clientX;
    startY = touch.clientY;
    state = "pending";
    samples = [{ t: event.timeStamp, y: touch.clientY }];
  };

  const find = (list: TouchList) => {
    for (const touch of list) if (touch.identifier === id) return touch;
    return null;
  };

  const onMove = (event: TouchEvent) => {
    if (id === null || state === "scroll") return;
    const touch = find(event.changedTouches);
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (state === "pending") {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      // Down and mostly down, with the page still at its top: the sheet's.
      if (dy > 0 && dy >= Math.abs(dx) && window.scrollY <= 0) {
        state = "drag";
        startY = touch.clientY;
      } else {
        reset();
        return;
      }
    }

    // Holds the page still, and keeps Safari's overscroll bounce out of it.
    event.preventDefault();
    samples.push({ t: event.timeStamp, y: touch.clientY });
    while (samples.length > 2 && event.timeStamp - samples[0]!.t > WINDOW) {
      samples.shift();
    }
    handlers.onMove(resist(touch.clientY - startY));
  };

  const finish = (allowClose: boolean) => {
    const first = samples[0];
    const last = samples[samples.length - 1];
    const offset = last ? last.y - startY : 0;
    const elapsed = first && last ? last.t - first.t : 0;
    const speed =
      elapsed > 0 && first && last ? (last.y - first.y) / elapsed : 0;
    const close =
      allowClose &&
      speed > -FLICK &&
      (speed >= FLICK || offset >= window.innerHeight * DISTANCE);
    handlers.onEnd(close);
  };

  const onEnd = (event: TouchEvent) => {
    if (id === null) return;
    if (!find(event.changedTouches)) return;
    if (state === "drag") finish(event.type === "touchend");
    reset();
  };

  sheet.addEventListener("touchstart", onStart, { passive: true });
  // Not passive: it has to be able to keep the page from scrolling.
  sheet.addEventListener("touchmove", onMove, { passive: false });
  sheet.addEventListener("touchend", onEnd);
  sheet.addEventListener("touchcancel", onEnd);
  return () => {
    sheet.removeEventListener("touchstart", onStart);
    sheet.removeEventListener("touchmove", onMove);
    sheet.removeEventListener("touchend", onEnd);
    sheet.removeEventListener("touchcancel", onEnd);
  };
}
