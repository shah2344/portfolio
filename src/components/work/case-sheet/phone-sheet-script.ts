/*
 * Directs the view transition between the homepage and a case study on a
 * phone (`phone-sheet.ts`). Inlined at the top of every document, since the
 * arriving one has to set its direction before its first frame.
 *
 * As a document is swapped out it records which way the reader is going:
 * from the homepage to a story is "open", back is "close". The arriving
 * document takes that, marks its root for the `data-case-sheet-vt` rules in
 * `globals.css`, and clears it when the transition ends. Any other change
 * between documents skips the transition.
 *
 * An opened story also keeps `data-case-sheet-arrival`, which settles its
 * intro before paint (the sheet rising is its entrance), and lays out only
 * its first screen until it has landed (`data-case-sheet-landing`).
 *
 * A story with the homepage just behind it in history is drawn stacked over
 * it (`data-case-sheet-stacked`), on every showing: opened, reloaded, or
 * stepped forward to.
 */

export const FROM_KEY = "case-sheet:from";
export const TRANSITION_KEY = "case-sheet:transition";
export const PULLED_KEY = "case-sheet:pulled";
export const HOME_SCROLL_KEY = "case-sheet:home-scroll";

function direct(
  from: string,
  transition: string,
  pulled: string,
  homeScroll: string,
) {
  const storage = window.sessionStorage;
  const root = document.documentElement;
  const isStory = (path: string) => path.startsWith("/work/");

  type Navigation = {
    currentEntry: { index: number } | null;
    entries(): { url: string | null }[];
  };
  // Keep in step with `homeIsBehind` in `phone-sheet.ts`.
  const stack = () => {
    const path = window.location.pathname;
    let behind = false;
    if (isStory(path)) {
      const navigation = (window as { navigation?: Navigation }).navigation;
      const current = navigation?.currentEntry;
      if (navigation && current) {
        const previous = navigation.entries()[current.index - 1];
        behind = previous?.url ? new URL(previous.url).pathname === "/" : false;
      } else {
        behind = storage.getItem(from) === path;
      }
    }
    if (behind) root.dataset.caseSheetStacked = "";
    else delete root.dataset.caseSheetStacked;
  };
  stack();
  const directionOf = (from: string, to: string | null) => {
    if (from === "/" && (to === null || isStory(to))) return "open";
    if (isStory(from) && (to === null || to === "/")) return "close";
    return null;
  };

  type Swap = Event & {
    viewTransition: ViewTransition | null;
    activation?: { entry?: { url?: string | null } } | null;
  };
  type Reveal = Event & { viewTransition: ViewTransition | null };

  window.addEventListener("pageswap", (event) => {
    const { activation, viewTransition } = event as Swap;
    if (!viewTransition) return;
    const url = activation?.entry?.url;
    const direction = directionOf(
      window.location.pathname,
      url ? new URL(url).pathname : null,
    );
    if (direction) {
      storage.setItem(transition, direction);
      if (direction === "open") {
        storage.setItem(homeScroll, String(window.scrollY));
      }
    } else {
      storage.removeItem(transition);
      viewTransition.skipTransition();
    }
  });

  window.addEventListener("pagereveal", (event) => {
    stack();
    const direction = storage.getItem(transition);
    const offset = Number(storage.getItem(pulled)) || 0;
    storage.removeItem(transition);
    storage.removeItem(pulled);
    const { viewTransition } = event as Reveal;
    if (!viewTransition) return;
    const path = window.location.pathname;
    if (
      !(direction === "open" && isStory(path)) &&
      !(direction === "close" && path === "/")
    ) {
      viewTransition.skipTransition();
      return;
    }
    root.dataset.caseSheetVt = direction;
    // Safari restores the homepage from its back-forward cache at the top
    // and only scrolls it back once the transition has ended, so the
    // picture it would slide in is of the top. Its place goes back first.
    const y = Number(storage.getItem(homeScroll));
    if (direction === "close" && y > 0) {
      window.scrollTo({ top: y, behavior: "instant" });
    }
    // The page behind gives up 8px a side, as the sheet's does.
    root.style.setProperty(
      "--case-sheet-scale",
      String(1 - 16 / window.innerWidth),
    );
    if (direction === "open") {
      root.dataset.caseSheetArrival = "";
      root.dataset.caseSheetLanding = "";
    } else if (offset > 0) {
      // The story's picture sits that far down, and the homepage had come
      // part way forward.
      root.style.setProperty("--case-sheet-pulled", `${offset}px`);
      root.style.setProperty(
        "--case-sheet-depth",
        String(Math.max(0, 1 - offset / window.innerHeight)),
      );
    }
    void viewTransition.finished.finally(() => {
      delete root.dataset.caseSheetVt;
      root.style.removeProperty("--case-sheet-scale");
      root.style.removeProperty("--case-sheet-depth");
      root.style.removeProperty("--case-sheet-pulled");
      if (root.dataset.caseSheetLanding === undefined) return;
      delete root.dataset.caseSheetLanding;
      // The story's measurers (line ink, contents bar) take its full length.
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
  });
}

export const phoneSheetScript = `try{(${direct.toString()})(${[FROM_KEY, TRANSITION_KEY, PULLED_KEY, HOME_SCROLL_KEY].map((key) => JSON.stringify(key)).join(",")})}catch(e){}`;
