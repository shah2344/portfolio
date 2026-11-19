"use client";

import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Drawer } from "vaul";

import { observeCaseStudyLineInk } from "@/components/motion/case-study-line-ink";
import { holdMedia } from "@/components/motion/page-wipe";

import styles from "./case-sheet.module.css";

type Story = { href: string; name: string; content: ReactNode };

/* Vaul's own duration and curve, so the page behind moves with the sheet. */
const DURATION = 500;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
/* Behind an open sheet the page gives up 8px a side and drops 14px below the
   safe area, as in Vaul's `shouldScaleBackground`. Its top corners round to
   the sheet's radius; see `.corners` in the stylesheet. */
const GUTTER = 16;
const DROP = 14;
/* A card that was clicked but whose route never arrived lets go after this. */
const ABANDON = 2000;

const FROZEN = styles.frozen as string;

let themeColorWatch: MutationObserver | null = null;

/** Sets each `theme-color` to black, or back to the colour it carried. */
function paintThemeColors(frozen: boolean) {
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )) {
    if (frozen) {
      if (meta.content === "#000") continue;
      meta.dataset.caseSheetColor = meta.content;
      meta.content = "#000";
    } else if (meta.dataset.caseSheetColor !== undefined) {
      meta.content = meta.dataset.caseSheetColor;
      delete meta.dataset.caseSheetColor;
    }
  }
}

/** Paints the browser's status bar black over the frozen page, or hands it
 *  back to the page's own ground. Safari 26 tints from the root's
 *  background, earlier browsers from `theme-color`. The route change to the
 *  story renders fresh `theme-color` tags, so those are painted as they
 *  arrive. */
function paintStatusBar(frozen: boolean) {
  const root = document.documentElement;
  themeColorWatch?.disconnect();
  themeColorWatch = null;
  paintThemeColors(frozen);
  if (frozen) {
    root.dataset.caseSheetFrozen = "";
    themeColorWatch = new MutationObserver(() => paintThemeColors(true));
    themeColorWatch.observe(document.head, { childList: true });
  } else {
    delete root.dataset.caseSheetFrozen;
  }
}

/*
 * The intercepted route and the homepage are siblings, not parent and child,
 * so the route hands its story to the homepage's sheet here. The sheet keeps
 * the story it was given after the route lets go, for as long as it takes to
 * slide away.
 */
let current: Story | null = null;
let listener: ((story: Story | null) => void) | null = null;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Runs `then` once the frame being built now has been drawn: at the start of
 * the frame after it. A page that draws no frames (a background tab) still
 * gets there, on a timer.
 */
function afterThisFrame(then: () => void) {
  let done = false;
  let frame = 0;
  const run = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    then();
  };
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(run);
  });
  const timer = window.setTimeout(run, 250);
  return () => {
    done = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
  };
}

function enlargedTile() {
  return document.querySelector<HTMLDialogElement>("dialog.pg-frame[open]");
}

function linkPath(event: MouseEvent) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }
  const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
  return link ? { link, path: new URL(link.href).pathname } : null;
}

/**
 * Rendered by the intercepted `/work/[slug]` route: a case study opened from
 * the homepage. It draws nothing itself; the homepage's sheet shows it.
 */
export function CaseSheetEntry({
  children,
  href,
  name,
}: {
  children: ReactNode;
  href: string;
  name: string;
}) {
  useLayoutEffect(() => {
    // Off the homepage (the next case study, followed from a full page) there
    // is no sheet to rise, so the case study loads as a page of its own.
    if (!listener) {
      window.location.reload();
      return;
    }
    const story = { href, name, content: children };
    current = story;
    listener(story);
    return () => {
      if (current !== story) return;
      current = null;
      listener?.(null);
    };
  }, [children, href, name]);
  return null;
}

/**
 * The homepage, with its case studies opening as a Vaul sheet over it.
 *
 * The page behind recedes the way an iOS sheet's does: it scales back, drops
 * below the safe area, rounds its top corners over a black desk and fades
 * its content to a blank card, in step
 * with the sheet on the way in, out, and under a drag. One function paints
 * it, from one number: 0 at rest, 1 fully behind the sheet.
 *
 * Vaul's own `shouldScaleBackground` scales a wrapper from the document's
 * top edge, which on a scrolled homepage puts the rounded corners off screen.
 * So while the sheet is up the homepage is frozen here instead: pinned to
 * the viewport at the reader's scroll position, as a card that scales about
 * the top of the screen, with its fixed dock held in place inside it.
 */
export function CaseSheetHost({ children }: { children: ReactNode }) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<HTMLSpanElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const homeScroll = useRef(0);
  const openRef = useRef(false);
  const timer = useRef(0);
  const landTimer = useRef(0);
  const cancelFrame = useRef(() => {});
  const pausedVideos = useRef<HTMLVideoElement[]>([]);
  const opener = useRef<HTMLElement | null>(null);
  const [sheet, setSheet] = useState<HTMLDivElement | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [open, setOpen] = useState(false);
  const [landing, setLanding] = useState(false);

  /** Moves the page behind to `progress`, easing with the sheet when
   *  `animate`, or at once (under a finger, or with reduced motion). Only
   *  transform and opacity change, so the compositor runs it. */
  const paintHome = useCallback((progress: number, animate: boolean) => {
    const card = cardRef.current;
    const content = contentRef.current;
    const corners = cornersRef.current;
    if (!card || !content || !corners) return;
    const transition = animate && !reducedMotion();
    card.style.transition = transition
      ? `transform ${DURATION}ms ${EASE}`
      : "none";
    card.style.transform = `translate3d(0, calc((env(safe-area-inset-top) + ${DROP}px) * ${progress}), 0) scale(${1 - (GUTTER / window.innerWidth) * progress})`;
    // The caps' pseudo-elements inherit this transition and scale by the
    // property, so the radius itself eases to 0 with the card.
    corners.style.transition = transition
      ? `transform ${DURATION}ms ${EASE}`
      : "none";
    corners.style.setProperty("--corner-progress", String(progress));
    // Behind the sheet the card is a blank ground: its content fades out
    // with the same progress, and back in as the sheet goes.
    content.style.transition = transition
      ? `opacity ${DURATION}ms ${EASE}`
      : "none";
    content.style.opacity = String(1 - progress);
  }, []);

  /** Pins the homepage where the reader left it, still at rest. Done on the
   *  click, so the frame that rebuilds the page as a layer of its own is
   *  spent while the route resolves, not in the slide. */
  const freezeHome = useCallback(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content || stage.classList.contains(FROZEN)) return;
    // The card that opened it, to hand focus back to on the way out.
    opener.current =
      document.activeElement instanceof HTMLElement &&
      stage.contains(document.activeElement)
        ? document.activeElement
        : null;
    homeScroll.current = window.scrollY;
    stage.classList.add(FROZEN);
    paintStatusBar(true);
    content.style.top = `${-homeScroll.current}px`;
    // The page is behind the sheet now; its clips needn't keep decoding.
    pausedVideos.current = [...stage.querySelectorAll("video")].filter(
      (video) => !video.paused,
    );
    for (const video of pausedVideos.current) video.pause();
    paintHome(0, false);
  }, [paintHome]);

  const releaseHome = useCallback(() => {
    if (openRef.current) return;
    stageRef.current?.classList.remove(FROZEN);
    paintStatusBar(false);
    for (const ref of [cardRef, contentRef, cornersRef]) {
      ref.current?.removeAttribute("style");
    }
    window.scrollTo({ top: homeScroll.current, behavior: "instant" });
    for (const video of pausedVideos.current) {
      if (video.isConnected) void video.play().catch(() => {});
    }
    pausedVideos.current = [];
    setStory(null);
  }, []);

  /**
   * Starts the sheet, its dim and the page behind together. Each change of
   * state is one long task (mounting the story, re-rendering the route), and
   * WebKit starts an animation created in a long task from the last frame it
   * drew, so it would open part way through. Instead the sheet and its dim
   * are held at their start for the frame that task builds, and everything
   * moves from the next one, idle.
   */
  const startTogether = useCallback((then: () => void) => {
    const root = document.documentElement;
    root.dataset.caseSheetHeld = "";
    cancelFrame.current();
    cancelFrame.current = afterThisFrame(() => {
      delete root.dataset.caseSheetHeld;
      then();
    });
  }, []);

  const openSheet = useCallback(
    (next: Story) => {
      window.clearTimeout(timer.current);
      window.clearTimeout(landTimer.current);
      freezeHome();
      openRef.current = true;
      // Only the story's first screen is laid out while the sheet rises. The
      // rest — most of its elements, clips and glass — joins once the sheet
      // has stopped, where a long frame doesn't show.
      setLanding(true);
      setStory(next);
      setOpen(true);

      const land = () => {
        setLanding(false);
        // The story's measurers (line ink, contents bar) take a new length.
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
      };
      if (reducedMotion()) {
        paintHome(1, false);
        land();
        return;
      }
      // The story's clips wait for the sheet to land before they fetch and
      // decode, as they wait out a page change.
      let settle = () => {};
      holdMedia(new Promise<void>((resolve) => (settle = resolve)));
      startTogether(() => {
        paintHome(1, true);
        landTimer.current = window.setTimeout(() => {
          settle();
          land();
        }, DURATION);
      });
    },
    [freezeHome, paintHome, startTogether],
  );

  /** Slides the sheet away. A close the reader asks for here also steps
   *  back out of the case study's URL; one that comes from the URL (the
   *  browser's back button) already has. */
  const closeSheet = useCallback(
    (fromHistory: boolean) => {
      if (!openRef.current) return;
      openRef.current = false;
      window.clearTimeout(landTimer.current);
      setOpen(false);
      // Once the sheet is gone the page is let go. Stepping back out of the
      // URL re-renders the route, a long task, so it waits until then too,
      // and the page stays frozen until the route has let go of the story:
      // Next scrolls the document to the top as it does, which would
      // otherwise land on the restored page.
      const leave = () => {
        timer.current = window.setTimeout(
          () => {
            if (fromHistory || !current) {
              releaseHome();
              return;
            }
            router.back();
            timer.current = window.setTimeout(releaseHome, ABANDON);
          },
          reducedMotion() ? 0 : DURATION,
        );
      };
      if (reducedMotion()) {
        cancelFrame.current();
        paintHome(0, false);
        leave();
        return;
      }
      startTogether(() => {
        paintHome(0, true);
        leave();
      });
    },
    [paintHome, releaseHome, router, startTogether],
  );

  // Take stories from the intercepted route. Following the next case study
  // replaces the route, which lets go of one story just before it hands over
  // the next, so a let-go only closes once the hand-over has had its turn.
  useEffect(() => {
    listener = (next) => {
      if (!next) {
        queueMicrotask(() => {
          if (current) return;
          if (openRef.current) {
            closeSheet(true);
          } else {
            // Back out of the URL after a close from here.
            window.clearTimeout(timer.current);
            releaseHome();
          }
        });
      } else if (openRef.current) {
        setStory((shown) => {
          if (shown?.href !== next.href) {
            scrollerRef.current?.scrollTo({ top: 0, behavior: "instant" });
          }
          return next;
        });
      } else {
        openSheet(next);
      }
    };
    if (current) listener(current);
    return () => {
      listener = null;
    };
  }, [closeSheet, openSheet, releaseHome]);

  // Leaving the homepage with the sheet up lets the page go at once.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(landTimer.current);
      cancelFrame.current();
      delete document.documentElement.dataset.caseSheetHeld;
      paintStatusBar(false);
    },
    [],
  );

  // The story's line ink, media arrivals and phone contents bar listen for
  // the window's scroll and measure against the viewport. Inside the sheet
  // the scroll is the container's, so it is passed on to them. It also marks
  // when the story has left the top, the only time the header blur has
  // anything under it to blur.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!open || !sheet || !scroller) return;
    let scrolled = false;
    const relay = () => {
      window.dispatchEvent(new Event("scroll"));
      if (scroller.scrollTop > 0 === scrolled) return;
      scrolled = !scrolled;
      sheet.toggleAttribute("data-scrolled", scrolled);
    };
    scroller.addEventListener("scroll", relay, { passive: true });
    return () => scroller.removeEventListener("scroll", relay);
  }, [open, sheet]);

  return (
    <>
      <div
        className={styles.stage}
        onClickCapture={(event) => {
          const target = linkPath(event);
          if (!target?.path.startsWith("/work/") || openRef.current) return;
          freezeHome();
          // Should the sheet not follow, the page is let go again.
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(releaseHome, ABANDON);
        }}
        ref={stageRef}
      >
        <div className={styles.card} ref={cardRef}>
          <div className={styles.content} ref={contentRef}>
            {children}
          </div>
          <span
            aria-hidden="true"
            className={styles.corners}
            ref={cornersRef}
          />
        </div>
      </div>

      <Drawer.Root
        // Vaul 1.1.2 reads this one inverted: `false` stops it holding the
        // document still on iOS, which the frozen homepage already does.
        disablePreventScroll={false}
        // Drag by the handle only. Dragging from the story has Vaul run its
        // pointer handlers on every move of every scroll, walking up the DOM
        // reading scroll heights, which Safari pays for in layout mid-scroll.
        handleOnly
        // No `position: fixed` on the body in Safari; the homepage is
        // frozen here instead.
        noBodyStyles
        // Under a finger the page behind follows the sheet at once, by the
        // share of it dragged away…
        onDrag={(_, dragged) => {
          if (openRef.current) paintHome(1 - Math.min(1, dragged), false);
        }}
        // …and eases back with it if it is let go short of closing. A close
        // goes through `onOpenChange`.
        onOpenChange={(next) => {
          if (!next) closeSheet(false);
        }}
        onRelease={(_, stillOpen) => {
          if (stillOpen && openRef.current) paintHome(1, true);
        }}
        open={open}
      >
        <Drawer.Portal>
          <Drawer.Overlay className={styles.overlay} />
          <Drawer.Content
            aria-describedby={undefined}
            className={styles.sheet}
            data-landing={landing ? "" : undefined}
            onClickCapture={(event) => {
              const target = linkPath(event);
              if (!target) return;
              if (target.link.matches(".case-study-page__close")) {
                event.preventDefault();
                closeSheet(false);
              } else if (
                target.path.startsWith("/work/") &&
                target.path !== story?.href
              ) {
                // "View the next case study" swaps the story in place, and
                // back still returns to the homepage.
                event.preventDefault();
                router.replace(target.path, { scroll: false });
              }
            }}
            onCloseAutoFocus={(event) => {
              // Radix only returns focus to a `Drawer.Trigger`; the cards
              // are links of their own.
              event.preventDefault();
              opener.current?.focus({ preventScroll: true });
              opener.current = null;
            }}
            onEscapeKeyDown={(event) => {
              // An enlarged image closes before the sheet does.
              const tile = enlargedTile();
              if (!tile) return;
              event.preventDefault();
              tile.dispatchEvent(new Event("cancel", { cancelable: true }));
            }}
            onOpenAutoFocus={(event) => {
              // The sheet itself takes focus, not its close button, which
              // Safari would ring after a tap. Tab reaches the button next.
              event.preventDefault();
              (event.target as HTMLElement).focus({ preventScroll: true });
            }}
            onPointerDownOutside={(event) => {
              if (enlargedTile()) event.preventDefault();
            }}
            ref={setSheet}
          >
            {/* The story's own header blur and fade sit inside the scroller,
                which has to clip to the sheet's corners, and Chromium drops
                the blur's band masks under a rounded clip. So the sheet
                draws them, above the scroller and below the story's sticky
                controls; the story's copies are hidden. */}
            <div aria-hidden="true" className={styles.chrome}>
              <div className="case-study-page__blur">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="case-study-page__scrim" />
            </div>
            <div className={styles.grabber}>
              <Drawer.Handle className={styles.handle} />
            </div>
            <Drawer.Title className="sr-only">
              {story ? `${story.name} case study` : "Case study"}
            </Drawer.Title>
            <div
              className={styles.scroller}
              data-case-study-scroller=""
              ref={scrollerRef}
            >
              {story ? (
                <SheetStory key={story.href}>{story.content}</SheetStory>
              ) : null}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

/**
 * The case study as `PageTransition` would set it up, minus the entrance: the
 * sheet rising is the arrival, so the intro is settled before paint.
 */
function SheetStory({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const page = ref.current?.querySelector<HTMLElement>(".case-study-page");
    if (!page) return;
    page.dataset.caseArrival = "done";
    return observeCaseStudyLineInk(page);
  }, []);
  return <div ref={ref}>{children}</div>;
}
