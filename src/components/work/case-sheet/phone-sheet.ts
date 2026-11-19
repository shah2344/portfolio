/**
 * Case studies on a phone.
 *
 * Over the homepage, the sheet needs the homepage held behind it as a fixed,
 * full-screen layer, and iOS Safari tints its bars from such layers and only
 * collapses its toolbar for a page that scrolls. So on a phone a case study is
 * never a sheet: a card opens its story as a page of its own, by a full
 * navigation, and the sheet is only how the change looks. The browser carries
 * it across the two documents as a view transition (`@view-transition` and the
 * `data-case-sheet-vt` rules in `globals.css`, directed by
 * `phone-sheet-script.ts`).
 *
 * Coming back steps back through history, so iOS restores the homepage from
 * its back-forward cache exactly as the reader left it, scroll included. The
 * close button and a pull down from the story's top both do that.
 */

import { FROM_KEY, PULLED_KEY, TRANSITION_KEY } from "./phone-sheet-script";
import { trackSheetDrag } from "./sheet-gesture";

/** Narrow and touch: where the sheet would fight the browser. Keep in step
 *  with the `@view-transition` query in `globals.css`. */
export const PHONE_SHEET_QUERY = "(max-width: 780px) and (pointer: coarse)";

const DURATION = 500;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

function store(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

function read(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function isPhoneSheet() {
  return window.matchMedia(PHONE_SHEET_QUERY).matches;
}

/** Opens a case study from the homepage as its own page. */
export function openAsPage(path: string) {
  store(FROM_KEY, path);
  // Also written as the homepage is swapped out, where the browser says
  // where it is going; this covers browsers without that event.
  store(TRANSITION_KEY, "open");
  window.location.assign(path);
}

type HistoryEntry = { url: string | null };
type Navigation = {
  currentEntry: { index: number } | null;
  entries(): HistoryEntry[];
};

/** Whether the entry before this one in the tab's history is the homepage. */
export function homeIsBehind() {
  const navigation = (window as { navigation?: Navigation }).navigation;
  const current = navigation?.currentEntry;
  if (navigation && current) {
    const previous = navigation.entries()[current.index - 1];
    return previous?.url ? new URL(previous.url).pathname === "/" : false;
  }
  return read(FROM_KEY) === window.location.pathname;
}

/**
 * Steps back to the homepage the story was opened from, `pulled` px below
 * rest when a pull let it go.
 */
function closeToHome(pulled = 0) {
  store(TRANSITION_KEY, "close");
  if (pulled > 0) store(PULLED_KEY, String(Math.round(pulled)));
  history.back();
}

/**
 * On a phone, closes a story that was opened from the homepage by stepping
 * back to it. Returns whether it did; otherwise the caller closes as usual.
 */
export function closePhoneSheet() {
  if (!isPhoneSheet() || !homeIsBehind() || insideSheet()) return false;
  closeToHome();
  return true;
}

/** A story drawn in the homepage's sheet, not as a page. */
function insideSheet() {
  return document.querySelector("[data-vaul-drawer]") !== null;
}

/**
 * Pull down to dismiss. While the story sits at its top, a downward pull
 * from anywhere drags the whole page down over a black desk, its top corners
 * rounded (`data-case-sheet-pulling` in `globals.css`); see `sheet-gesture.ts`
 * for how a pull is told from a scroll and when letting go closes. A close
 * steps back with the page where the finger left it, and the transition
 * slides it on from there.
 */
export function watchPhonePull() {
  const root = document.documentElement;
  const page = document.querySelector<HTMLElement>("[data-site-root]");
  if (!page) return () => {};
  let offset = 0;
  let closing = false;
  let settle = 0;

  const rest = () => {
    window.clearTimeout(settle);
    delete root.dataset.caseSheetPulling;
    page.style.removeProperty("transform");
    page.style.removeProperty("transition");
  };

  const stop = trackSheetDrag(page, {
    canStart: () =>
      !closing && isPhoneSheet() && !insideSheet() && homeIsBehind(),
    onMove: (next) => {
      offset = next;
      window.clearTimeout(settle);
      root.dataset.caseSheetPulling = "";
      page.style.transition = "none";
      page.style.transform = `translate3d(0, ${next}px, 0)`;
    },
    onEnd: (close) => {
      if (close) {
        closing = true;
        closeToHome(offset);
        return;
      }
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      page.style.transition = reduced
        ? "none"
        : `transform ${DURATION}ms ${EASE}`;
      page.style.transform = "translate3d(0, 0, 0)";
      settle = window.setTimeout(rest, reduced ? 0 : DURATION);
    },
  });

  // Stepping forward again restores this page as it was left, mid-pull.
  const onShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    closing = false;
    rest();
  };
  window.addEventListener("pageshow", onShow);

  return () => {
    stop();
    window.removeEventListener("pageshow", onShow);
    rest();
  };
}
